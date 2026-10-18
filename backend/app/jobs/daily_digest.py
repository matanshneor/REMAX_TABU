"""Daily job: creates in-app notifications for upcoming deadlines.

Run by a Railway cron service: `python -m app.jobs.daily_digest`
"""

from datetime import date, datetime, timedelta, timezone

from app.supabase_client import get_service_client

EXCLUSIVITY_WARNING_DAYS = 7
EVICTION_WARNING_DAYS = 14


def property_label(p: dict) -> str:
    address = " ".join(x for x in (p.get("street"), p.get("house_number")) if x)
    return ", ".join(x for x in (address, p.get("city")) if x)


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
                "body": f"הבלעדיות על {property_label(p)} מסתיימת ב-{p['exclusivity_end']}",
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
                "body": f"מועד הפינוי של {property_label(p)} הוא {p['eviction_date']}",
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
    notifications = build_notifications(date.today())
    if notifications:
        get_service_client().table("notifications").insert(notifications).execute()
    print(f"daily_digest: created {len(notifications)} notifications")


if __name__ == "__main__":
    main()
