"""Leads from the public website (website/): a visitor's name, phone and message, optionally
about one of the listings on the site. No sign-in; called from the visitor's browser.

Each lead becomes a new buyer (status "new", lead source "אתר"). A lead about a listing goes to
that listing's agent, and the office manager gets a copy; while the agent has no CRM account
yet, and for a general enquiry, it goes to the manager. A visitor the agent already has as a
buyer (same phone) goes into that buyer's call log instead of a duplicate. A lead from a property page also opens a task "לחזור ל…" linked to the buyer and the
property, so it shows on both cards. The agent gets a bell notification; the email is sent within a minute by the Gmail script in the
office mailbox, which picks up notifications with emailed_at empty (edge function website-lead-emails),
because Railway's plan blocks outbound SMTP.

Spam: a hidden field that people leave empty, and rate limits per visitor and overall.
"""

import logging
import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.config import get_settings
from app.rate_limit import RateLimiter
from app.supabase_client import get_service_client

router = APIRouter(prefix="/public", tags=["public"])
log = logging.getLogger(__name__)

LEAD_SOURCE = "אתר"
PER_VISITOR = RateLimiter(limit=5, window_seconds=10 * 60)
OVERALL = RateLimiter(limit=60, window_seconds=60 * 60)


def format_il_phone(raw: str) -> str | None:
    """Same as public.format_il_phone in the database: '0521234567' -> '052-123-4567'.
    None when it isn't an Israeli phone number."""
    d = re.sub(r"\D", "", raw)
    if d.startswith("00972"):
        d = "0" + d[5:]
    elif d.startswith("972"):
        d = "0" + d[3:]
    if len(d) == 10 and d.startswith("0"):
        return f"{d[:3]}-{d[3:6]}-{d[6:]}"
    if len(d) == 9 and d.startswith("0"):
        return f"{d[:2]}-{d[2:5]}-{d[5:]}"
    return None


class LeadIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=80)
    phone: str = Field(max_length=30)
    message: str = Field(default="", max_length=2000)
    property_id: UUID | None = None
    # Hidden on the form: people never see it, bots fill it in.
    website: str = Field(default="", max_length=500)

    @field_validator("name")
    @classmethod
    def one_line(cls, v: str) -> str:
        return re.sub(r"\s+", " ", v)

    @field_validator("phone")
    @classmethod
    def israeli_phone(cls, v: str) -> str:
        formatted = format_il_phone(v)
        if not formatted:
            raise ValueError("מספר הטלפון לא תקין")
        return formatted


def visitor_key(request: Request) -> str:
    # Railway's proxy passes the visitor's address in X-Real-IP.
    real = request.headers.get("x-real-ip")
    if real:
        return real.strip()
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


def money(n: float | int | None) -> str:
    return f"{int(n):,} ₪" if n is not None else ""


def rooms_text(r: float | int | None) -> str:
    if r is None:
        return ""
    return f"{int(r) if float(r).is_integer() else r} חד׳"


def property_label(p: dict) -> str:
    """'דירת גן, 5 חד׳, הרב בצלאל 12, גילה · 2,500,000 ₪' (what the site shows)."""
    street = " ".join(x for x in (p.get("street"), p.get("house_number")) if x)
    parts = [p.get("property_type"), rooms_text(p.get("rooms")), street, p.get("neighborhood")]
    label = ", ".join(x for x in parts if x)
    price = money(p.get("current_price"))
    return f"{label} · {price}" if price else label


def property_url(p: dict) -> str:
    base = get_settings().website_url.rstrip("/")
    return f"{base}/properties/{p['id']}" if base else ""


def lead_text(lead: LeadIn, prop: dict | None) -> str:
    lines = ["פנייה מהאתר", lead.message or "(בלי הודעה)"]
    if prop:
        lines.append(f"נכס: {property_label(prop)}")
        if prop.get("agent_name"):
            lines.append(f"הסוכן של הנכס: {prop['agent_name']}")
        if url := property_url(prop):
            lines.append(url)
    return "\n".join(lines)


def listing_agent(client, property_id: str) -> str | None:
    """The CRM account of the agent whose listing this is; None while they have no account."""
    prop = client.table("properties").select("recruiter_id").eq("id", property_id).maybe_single().execute()
    recruiter = prop.data.get("recruiter_id") if prop is not None and prop.data else None
    if not recruiter:
        return None
    row = client.table("office_agents").select("profile_id").eq("id", recruiter).maybe_single().execute()
    return row.data.get("profile_id") if row is not None and row.data else None


@router.post("/leads")
def create_lead(lead: LeadIn, request: Request) -> dict:
    if lead.website:
        # A bot filled the hidden field: answer as if it worked, save nothing.
        log.info("lead dropped: hidden field filled")
        return {"ok": True}
    if not PER_VISITOR.allow(visitor_key(request)) or not OVERALL.allow("all"):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "נשלחו הרבה פניות ברצף. אפשר לנסות שוב בעוד כמה דקות, או להתקשר.",
        )

    client = get_service_client()
    settings = get_settings()

    agent = (
        client.table("office_agents").select("profile_id").eq("id", settings.website_agent_id)
        .maybe_single().execute()
    )
    manager_id = agent.data.get("profile_id") if agent is not None and agent.data else None
    if not manager_id:
        log.error("lead not saved: website agent %s has no CRM account", settings.website_agent_id)
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "לא הצלחנו לשמור את הפנייה. אפשר להתקשר או לשלוח וואטסאפ.")

    # Only a property that is on the site counts (the visitor may hold an old link).
    prop = None
    if lead.property_id:
        found = (
            client.table("website_properties")
            .select("id, property_type, rooms, street, house_number, neighborhood, city, current_price, agent_name")
            .eq("id", str(lead.property_id)).maybe_single().execute()
        )
        prop = found.data if found is not None and found.data else None

    # The listing's own agent gets the lead, when they have a CRM account; otherwise the manager.
    agent_id = (listing_agent(client, prop["id"]) if prop else None) or manager_id

    text = lead_text(lead, prop)
    existing = (
        client.table("buyers").select("id, full_name").eq("owner_agent_id", agent_id).eq("phone", lead.phone)
        .order("created_at").limit(1).execute().data
    )
    if existing:
        buyer_id = existing[0]["id"]
        client.table("buyer_notes").insert({"buyer_id": buyer_id, "author_id": None, "body": text}).execute()
        title = f"פנייה חוזרת מהאתר: {existing[0]['full_name']}"
    else:
        buyer = (
            client.table("buyers")
            .insert({
                "full_name": lead.name,
                "phone": lead.phone,
                "owner_agent_id": agent_id,
                "created_by": None,
                "status": "new",
                "lead_source": LEAD_SOURCE,
                "notes": text,
            })
            .execute()
            .data[0]
        )
        buyer_id = buyer["id"]
        title = f"פנייה חדשה מהאתר: {lead.name}"

    if prop:
        client.table("tasks").insert({
            "title": f"לחזור ל{lead.name}: פנייה מהאתר",
            "description": text,
            "due_at": datetime.now(timezone.utc).isoformat(),
            "assigned_to": agent_id,
            "created_by": agent_id,
            "buyer_id": buyer_id,
            "property_id": prop["id"],
        }).execute()

    body = " · ".join(x for x in (lead.phone, property_label(prop) if prop else None) if x)
    note = {"kind": "website_lead", "title": title, "body": body, "link": f"/buyers?open={buyer_id}"}
    client.table("notifications").insert({**note, "recipient_id": agent_id}).execute()
    if agent_id != manager_id:
        # The manager's copy says whose listing it is.
        name = (prop or {}).get("agent_name")
        client.table("notifications").insert({
            **note,
            "recipient_id": manager_id,
            "body": " · ".join(x for x in (body, f"הסוכן: {name}" if name else None) if x),
        }).execute()
    return {"ok": True}
