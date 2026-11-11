# CRM

The office's internal system for sellers (properties), buyers, tasks, deals, finances and job candidates, plus a pool of new Yad2 listings to call. Hebrew, right-to-left, prices in shekels.

| Folder | What's in it |
|---|---|
| `frontend/` | The CRM screens: Next.js 16, Tailwind, shadcn/ui |
| `backend/` | FastAPI: the admin's data export (`GET /export/{table}`) and the daily notifications job (`app/jobs/daily_digest.py`) |

The database is in [../supabase](../supabase/README.md). The ad tool opens from a property's **יצירת מודעה** button and is served at `/ad-tool` on the CRM's address (see [../ad-tool](../ad-tool/README.md)).

## Running locally

```bash
# backend
cd crm/backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env   # fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
.venv/bin/uvicorn app.main:app --reload --port 8000

# frontend
cd crm/frontend
npm install
cp .env.example .env.local   # fill in the Supabase URL and the publishable key
npm run dev                  # http://localhost:3000
```

The daily job runs every day at 08:00 Israel time, summer and winter. The cron fires at 05:00 and 06:00 UTC, and the job only works on the run that lands on 08:00 in Israel (set `DAILY_DIGEST_FORCE=1` to run it at any hour by hand). It creates notifications for:
- Exclusivity ending in 7 days and in 1 day.
- Eviction dates in 14, 7 and 1 days.
- Tasks that became overdue (each one once).

After deploying, in Supabase under **Authentication → URL Configuration**, set the Site URL to the frontend's Railway address. Without it, links in the "forgot password" emails point to localhost.

## Yad2 alerts and sign-up emails

New Yad2 listings reach the **מאגר יד 2** (Yad2 pool) in two ways:
- **Automatic:** Yad2 alert emails arrive at `remaxtabu@gmail.com`. A Google Apps Script in that mailbox (`supabase/gmail-script/yad2-gmail-script.gs`) sends them every hour to the `yad2-email-intake` edge function, which adds the listings to the pool. Only listings in the office's area (פסגת זאב) are added, and nothing already in the pool or among the sellers. Handled emails get the Gmail label `נקלט ל-CRM`.
- **By hand (admin only):** on the **גיוס נכסים חדשים** page, paste a table copied from Yad2 Plus. Existing listings get their phone number updated.

The same script also checks every 5 minutes for new agents waiting for approval, and emails the admins about each one, once.

Setup:
1. Deploy the function: `supabase functions deploy yad2-email-intake` (it's set to `verify_jwt = false` in `supabase/config.toml`; it checks its own key instead).
2. Pick a secret key and save its SHA-256 in the database:
   ```sql
   insert into public.intake_keys (name, key_sha256)
   values ('gmail-script', encode(extensions.digest('the-secret-key', 'sha256'), 'hex'));
   ```
3. In `remaxtabu@gmail.com`, open [script.google.com](https://script.google.com), create a project, paste `supabase/gmail-script/yad2-gmail-script.gs`, put the secret key in `CRM_KEY`, choose the `install` function and click Run (once only).

## Phone calendar

Each user can subscribe their phone calendar to their own open tasks, from the **משימות** (Tasks) page. The link holds a personal secret token. Creating a new link turns off the old one. The feed is served by `crm/frontend/src/app/api/calendar/[token]`.

## The link to the website

A listing that is on the site has "העתקת קישור לאתר" in its panel and in its WhatsApp message (`frontend/src/lib/website.ts`), and the manager alone has **העלאה לאתר** / **הורדה מהאתר** there. Details are in [../website/README.md](../website/README.md).
