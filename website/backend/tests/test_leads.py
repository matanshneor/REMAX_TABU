"""Tests for POST /public/leads, against an in-memory stand-in for the Supabase client.

Run from backend/:  python -m pytest tests
"""

import os
import uuid

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test")
os.environ.setdefault("WEBSITE_URL", "https://site.test")

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import leads

AGENT_ROW = "63a51f45-fdef-4797-855d-12d8b9405960"
AGENT = "07afb519-7e93-4d02-97e7-666fac968316"
OTHER_AGENT = "00000000-0000-0000-0000-0000000000b1"
LISTED = "50000000-0000-0000-0000-000000000001"
NOT_LISTED = "50000000-0000-0000-0000-000000000009"
OTHER_ROW = "40000000-0000-0000-0000-0000000000b1"
NO_ACCOUNT_ROW = "40000000-0000-0000-0000-0000000000b2"
OTHERS_LISTING = "50000000-0000-0000-0000-000000000002"
NO_ACCOUNT_LISTING = "50000000-0000-0000-0000-000000000003"


class Query:
    def __init__(self, db: "FakeDb", table: str) -> None:
        self.db, self.table, self.filters = db, table, []
        self.op, self.payload, self.single, self.max = "select", None, False, None

    def select(self, *_):
        return self

    def eq(self, col, val):
        self.filters.append((col, val))
        return self

    def order(self, *_):
        return self

    def limit(self, n):
        self.max = n
        return self

    def maybe_single(self):
        self.single = True
        return self

    def insert(self, row):
        self.op, self.payload = "insert", row
        return self

    def update(self, row):
        self.op, self.payload = "update", row
        return self

    def execute(self):
        rows = self.db.tables.setdefault(self.table, [])
        if self.op == "insert":
            row = {"id": str(uuid.uuid4()), **self.payload}
            rows.append(row)
            return Result([row])
        matched = [r for r in rows if all(str(r.get(c)) == str(v) for c, v in self.filters)]
        if self.op == "update":
            for r in matched:
                r.update(self.payload)
            return Result(matched)
        if self.single:
            return Result(matched[0]) if matched else None  # like supabase-py: None when no row
        return Result(matched[: self.max] if self.max else matched)


class Result:
    def __init__(self, data):
        self.data = data


class FakeDb:
    def __init__(self) -> None:
        self.tables: dict[str, list[dict]] = {
            "office_agents": [
                {"id": AGENT_ROW, "profile_id": AGENT},
                {"id": OTHER_ROW, "profile_id": OTHER_AGENT},
                {"id": NO_ACCOUNT_ROW, "profile_id": None},
            ],
            "properties": [
                {"id": LISTED, "recruiter_id": AGENT_ROW},
                {"id": OTHERS_LISTING, "recruiter_id": OTHER_ROW},
                {"id": NO_ACCOUNT_LISTING, "recruiter_id": NO_ACCOUNT_ROW},
            ],
            "profiles": [{"id": AGENT, "email": "manager@test.local"}],
            "website_properties": [{
                "id": LISTED, "property_type": "דירת גן", "rooms": 5, "street": "הרב בצלאל", "house_number": "12",
                "neighborhood": "גילה", "city": "ירושלים", "current_price": 2500000, "agent_name": "מנהל בדיקה",
            }, {
                "id": OTHERS_LISTING, "property_type": "דירה", "rooms": 3, "street": "הגפן", "house_number": "4",
                "neighborhood": "גילה", "city": "ירושלים", "current_price": 1900000, "agent_name": "סוכן אחר",
            }, {
                "id": NO_ACCOUNT_LISTING, "property_type": "דירה", "rooms": 4, "street": "התאנה", "house_number": "8",
                "neighborhood": "גילה", "city": "ירושלים", "current_price": 2100000, "agent_name": "סוכנת בלי חשבון",
            }],
            "buyers": [
                {"id": "b-other", "full_name": "קונה של סוכן אחר", "phone": "052-111-2222", "owner_agent_id": OTHER_AGENT},
            ],
        }

    def table(self, name):
        return Query(self, name)

    def rows(self, name):
        return self.tables.get(name, [])


@pytest.fixture
def db(monkeypatch):
    fake = FakeDb()
    monkeypatch.setattr(leads, "get_service_client", lambda: fake)
    leads.PER_VISITOR.reset()
    leads.OVERALL.reset()
    return fake


client = TestClient(app)


def post(**body):
    return client.post("/public/leads", json={"name": "ישראל ישראלי", "phone": "0521234567", **body})


def test_new_lead_from_property_page(db):
    r = post(message="מעוניין לראות את הדירה", property_id=LISTED)
    assert r.status_code == 200 and r.json() == {"ok": True}

    [buyer] = [b for b in db.rows("buyers") if b["owner_agent_id"] == AGENT]
    assert buyer["full_name"] == "ישראל ישראלי"
    assert buyer["phone"] == "052-123-4567"
    assert buyer["status"] == "new" and buyer["lead_source"] == "אתר"
    assert "מעוניין לראות את הדירה" in buyer["notes"]
    assert "דירת גן, 5 חד׳, הרב בצלאל 12, גילה · 2,500,000 ₪" in buyer["notes"]
    assert f"https://site.test/properties/{LISTED}" in buyer["notes"]

    [task] = db.rows("tasks")
    assert task["buyer_id"] == buyer["id"] and task["property_id"] == LISTED and task["assigned_to"] == AGENT

    [note] = db.rows("notifications")
    assert note["recipient_id"] == AGENT and note["kind"] == "website_lead"
    assert note["link"] == f"/buyers?open={buyer['id']}"
    assert not note.get("emailed_at")  # the Gmail script emails it within a minute, then marks it


def test_lead_on_another_agents_listing_goes_to_that_agent_with_a_copy_to_the_manager(db):
    assert post(message="מתי אפשר לראות?", property_id=OTHERS_LISTING).status_code == 200
    [buyer] = [b for b in db.rows("buyers") if b["full_name"] == "ישראל ישראלי"]
    assert buyer["owner_agent_id"] == OTHER_AGENT
    assert "הסוכן של הנכס: סוכן אחר" in buyer["notes"]
    [task] = db.rows("tasks")
    assert task["assigned_to"] == OTHER_AGENT and task["property_id"] == OTHERS_LISTING
    notes = db.rows("notifications")
    assert [n["recipient_id"] for n in notes] == [OTHER_AGENT, AGENT]
    assert all(n["kind"] == "website_lead" and n["link"] == f"/buyers?open={buyer['id']}" for n in notes)
    assert "הסוכן: סוכן אחר" in notes[1]["body"]


def test_lead_on_a_listing_of_an_agent_without_an_account_goes_to_the_manager(db):
    assert post(property_id=NO_ACCOUNT_LISTING).status_code == 200
    [buyer] = [b for b in db.rows("buyers") if b["full_name"] == "ישראל ישראלי"]
    assert buyer["owner_agent_id"] == AGENT
    assert "הסוכן של הנכס: סוכנת בלי חשבון" in buyer["notes"]
    [note] = db.rows("notifications")
    assert note["recipient_id"] == AGENT


def test_general_lead_has_no_task(db):
    assert post(message="מחפשים 4 חדרים בגילה").status_code == 200
    assert len([b for b in db.rows("buyers") if b["owner_agent_id"] == AGENT]) == 1
    assert db.rows("tasks") == []
    assert len(db.rows("notifications")) == 1


def test_property_not_on_the_site_is_ignored(db):
    assert post(property_id=NOT_LISTED).status_code == 200
    [buyer] = [b for b in db.rows("buyers") if b["owner_agent_id"] == AGENT]
    assert "נכס:" not in buyer["notes"]
    assert db.rows("tasks") == []


def test_returning_visitor_goes_to_the_call_log(db):
    db.tables["buyers"].append({"id": "b-mine", "full_name": "ישראל", "phone": "052-123-4567", "owner_agent_id": AGENT})
    assert post(phone="+972-52-123-4567", message="שוב אני", property_id=LISTED).status_code == 200
    assert len([b for b in db.rows("buyers") if b["owner_agent_id"] == AGENT]) == 1  # no duplicate
    [log] = db.rows("buyer_notes")
    assert log["buyer_id"] == "b-mine" and "שוב אני" in log["body"]
    [task] = db.rows("tasks")
    assert task["buyer_id"] == "b-mine"
    assert db.rows("notifications")[0]["title"].startswith("פנייה חוזרת מהאתר")


def test_another_agents_buyer_with_the_same_phone_is_not_touched(db):
    assert post(phone="052-111-2222").status_code == 200
    assert len([b for b in db.rows("buyers") if b["owner_agent_id"] == AGENT]) == 1
    assert db.rows("buyer_notes") == []


def test_hidden_field_drops_the_lead(db):
    r = post(website="http://spam.example")
    assert r.status_code == 200
    assert len(db.rows("buyers")) == 1 and db.rows("notifications") == []


@pytest.mark.parametrize("body", [
    {"name": "א"},                   # too short
    {"phone": "12345"},              # not a phone
    {"phone": "052123456789"},       # too long
    {"message": "x" * 2001},
    {"property_id": "not-a-uuid"},
])
def test_invalid_input_is_rejected(db, body):
    assert post(**body).status_code == 422
    assert db.rows("notifications") == []


def test_rate_limit_per_visitor(db):
    codes = [post(phone=f"05212345{i:02d}").status_code for i in range(6)]
    assert codes == [200] * 5 + [429]


@pytest.mark.parametrize("raw, expected", [
    ("0521234567", "052-123-4567"),
    ("052-123-4567", "052-123-4567"),
    ("+972 52 123 4567", "052-123-4567"),
    ("00972521234567", "052-123-4567"),
    ("026543210", "02-654-3210"),
    ("12345", None),
])
def test_phone_format_matches_the_database(raw, expected):
    assert leads.format_il_phone(raw) == expected
