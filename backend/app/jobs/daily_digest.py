"""Daily job: creates in-app notifications for upcoming deadlines.

Run by a Railway cron service: `python -m app.jobs.daily_digest`
Railway cron runs in UTC, so it fires at 05:00 and 06:00 UTC and the job only works
on the run that falls at 08:00 in Israel — summer (UTC+3) or winter (UTC+2).
Set DAILY_DIGEST_FORCE=1 to run it at any hour (manual runs).
"""

import os
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.supabase_client import get_service_client

EXCLUSIVITY_WARNING_DAYS = 7
EVICTION_WARNING_DAYS = 14
ISRAEL = ZoneInfo("Asia/Jerusalem")
RUN_HOUR = 8


def property_label(p: dict) -> str:
    address = " ".join(x for x in (p.get("street"), p.get("house_number")) if x)
    return ", ".join(x for x in (address, p.get("city")) if x)


def he_date(iso: str, today: date) -> str:
    """'2026-10-24' -> '24.10.26 (בעוד 5 ימים)' — the way people in the office read dates."""
    d = date.fromisoformat(iso[:10])
    days = (d - today).days
    when = "היום" if days == 0 else "מחר" if days == 1 else f"בעוד {days} ימים"
    return f"{d.day}.{d.month}.{d.year % 100:02d} ({when})"


def build_notifications(today: date) -> list[dict]:
    client = get_service_client()
    notifications: list[dict] = []

    admin_ids = [
        r["id"] for r in client.table("profiles").select("id").eq("role", "admin").execute().data
    ]

    exclusivity_ending = (
        client.table("properties")
        .select("id, street, house_number, city, recruiting_agent_id, exclusivity_end")
        .eq("is_exclusive", True)
        .gte("exclusivity_end", today.isoformat())
        .lte("exclusivity_end", (today + timedelta(days=EXCLUSIVITY_WARNING_DAYS)).isoformat())
        .execute()
        .data
    )
    for p in exclusivity_ending:
        recipients = {p["recruiting_agent_id"], *admin_ids} - {None}
        for recipient in recipients:
            notifications.append({
                "recipient_id": recipient,
                "kind": "exclusivity_ending",
                "title": "בלעדיות עומדת להסתיים",
                "body": f"הבלעדיות על {property_label(p)} מסתיימת ב-{he_date(p['exclusivity_end'], today)}",
                "link": f"/properties?open={p['id']}",
            })

    evictions = (
        client.table("properties")
        .select("id, street, house_number, city, recruiting_agent_id, eviction_date")
        .eq("status", "active")
        .gte("eviction_date", today.isoformat())
        .lte("eviction_date", (today + timedelta(days=EVICTION_WARNING_DAYS)).isoformat())
        .execute()
        .data
    )
    for p in evictions:
        if p["recruiting_agent_id"]:
            notifications.append({
                "recipient_id": p["recruiting_agent_id"],
                "kind": "eviction_upcoming",
                "title": "מועד פינוי מתקרב",
                "body": f"מועד הפינוי של {property_label(p)} הוא {he_date(p['eviction_date'], today)}",
                "link": f"/properties?open={p['id']}",
            })

    overdue_tasks = (
        client.table("tasks")
        .select("id, title, assigned_to")
        .eq("is_done", False)
        .lt("due_at", datetime.now(timezone.utc).isoformat())
        .not_.is_("assigned_to", "null")
        .execute()
        .data
    )
    for t in overdue_tasks:
        notifications.append({
            "recipient_id": t["assigned_to"],
            "kind": "task_overdue",
            "title": "משימה באיחור",
            "body": t["title"],
            "link": f"/tasks?open={t['id']}",
        })

    return notifications


def main() -> None:
    now = datetime.now(ISRAEL)
    if now.hour != RUN_HOUR and os.environ.get("DAILY_DIGEST_FORCE") != "1":
        print(f"daily_digest: skipped, it is {now:%H:%M} in Israel (runs at {RUN_HOUR:02d}:00)")
        return
    notifications = build_notifications(now.date())
    if notifications:
        get_service_client().table("notifications").insert(notifications).execute()
    print(f"daily_digest: created {len(notifications)} notifications")


if __name__ == "__main__":
    main()
