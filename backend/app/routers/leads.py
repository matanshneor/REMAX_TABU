"""Leads from the public website (website/): a visitor's name, phone and message, optionally
about one of the listings on the site. No sign-in; called from the visitor's browser.

Each lead becomes a new buyer of the site's agent (status "new", lead source "אתר"). A visitor
the agent already has as a buyer (same phone) goes into that buyer's call log instead of a
duplicate. A lead from a property page also opens a task "לחזור ל…" linked to the buyer and the
property, so it shows on both cards. The agent gets a bell notification and an email at once.

Spam: a hidden field that people leave empty, and rate limits per visitor and overall.
"""

import html
import logging
import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.config import get_settings
from app.mailer import email_configured, send_email
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
    """'דירת גן, 5 חד׳, הרב בצלאל, גילה · 2,500,000 ₪' (no house number: public facts only)."""
    parts = [p.get("property_type"), rooms_text(p.get("rooms")), p.get("street"), p.get("neighborhood")]
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
        if url := property_url(prop):
            lines.append(url)
    return "\n".join(lines)


@router.post("/leads")
def create_lead(lead: LeadIn, request: Request, background: BackgroundTasks) -> dict:
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
    agent_id = agent.data.get("profile_id") if agent is not None and agent.data else None
    if not agent_id:
        log.error("lead not saved: website agent %s has no CRM account", settings.website_agent_id)
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "לא הצלחנו לשמור את הפנייה. אפשר להתקשר או לשלוח וואטסאפ.")

    # Only a property that is on the site counts (the visitor may hold an old link).
    prop = None
    if lead.property_id:
        found = (
            client.table("website_properties")
            .select("id, property_type, rooms, street, neighborhood, city, current_price")
            .eq("id", str(lead.property_id)).maybe_single().execute()
        )
        prop = found.data if found is not None and found.data else None

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
    notification = (
        client.table("notifications")
        .insert({
            "recipient_id": agent_id,
            "kind": "website_lead",
            "title": title,
            "body": body,
            "link": f"/buyers?open={buyer_id}",
        })
        .execute()
        .data[0]
    )
    background.add_task(email_lead, notification["id"], agent_id, title, lead, prop, buyer_id)
    return {"ok": True}


def email_lead(notification_id: str, agent_id: str, subject: str, lead: LeadIn, prop: dict | None, buyer_id: str) -> None:
    """Runs after the reply. A failure leaves emailed_at empty; the lead and the bell are saved anyway."""
    if not email_configured():
        log.warning("lead email skipped: GMAIL_APP_PASSWORD is not set")
        return
    client = get_service_client()
    try:
        profile = client.table("profiles").select("email").eq("id", agent_id).maybe_single().execute()
        to = profile.data.get("email") if profile is not None and profile.data else None
        if not to:
            log.warning("lead email skipped: the agent has no email")
            return
        crm_link = f"{get_settings().crm_url.rstrip('/')}/buyers?open={buyer_id}"
        esc = html.escape
        digits = re.sub(r"\D", "", lead.phone)
        wa = "972" + digits[1:]
        rows = [
            f"<p style='margin:0 0 4px'><b>{esc(lead.name)}</b></p>",
            f"<p style='margin:0 0 12px'><a href='tel:{digits}'>{esc(lead.phone)}</a>"
            f" · <a href='https://wa.me/{wa}'>וואטסאפ</a></p>",
        ]
        if lead.message:
            rows.append(f"<p style='margin:0 0 12px;white-space:pre-line'>{esc(lead.message)}</p>")
        if prop:
            label = esc(property_label(prop))
            url = property_url(prop)
            link = f"<a href='{esc(url)}'>{label}</a>" if url else label
            rows.append(f"<p style='margin:0 0 12px'>נכס: {link}</p>")
        rows.append(f"<p style='margin:16px 0 0'><a href='{esc(crm_link)}'>לכרטיס הקונה ב-CRM</a></p>")
        page = f"<div dir='rtl' style='font-family:Arial,sans-serif;font-size:15px;line-height:1.5'>{''.join(rows)}</div>"
        plain = "\n".join(x for x in (lead.name, lead.phone, lead.message, property_label(prop) if prop else "", crm_link) if x)
        send_email(to, subject, page, plain)
        client.table("notifications").update({"emailed_at": datetime.now(timezone.utc).isoformat()}).eq("id", notification_id).execute()
    except Exception:
        log.exception("lead email failed (notification %s)", notification_id)
