# Real Estate Agency CRM

An internal system for managing sellers (properties), buyers, tasks, deals, finances and job candidates, plus a pool of new Yad2 listings to call. The interface is in Hebrew, right-to-left, with prices in shekels.

| Folder | What's in it |
|---|---|
| `frontend/` | The website: Next.js 16, Tailwind, shadcn/ui. Also holds the ad tool (`frontend/public/ad-tool/`) |
| `backend/` | Server: FastAPI (data export for the admin, daily notifications job) |
| `supabase/` | Database: tables, permissions (RLS), file storage, permission tests, and the `yad2-email-intake` edge function |
| `docs/` | Brand guidelines and the Gmail script (`yad2-gmail-script.gs`) |

## 1. Supabase (database)

1. Create a project at [supabase.com](https://supabase.com).
2. Run **all** the files in `supabase/migrations/`, in order by file name. The easiest way:
   ```bash
   supabase link --project-ref <id>
   supabase db push
   ```
   (You can also paste them one by one into the SQL Editor, oldest first.)
3. Run `supabase/tests/rls_test.sql` in the SQL Editor. If it ends with `ALL RLS TESTS PASSED`, the permissions work. The test leaves no data behind.
4. Under **Authentication → Sign In / Providers**, turn on "Allow new users to sign up" and turn off "Confirm email". This lets agents sign up on their own; every new account waits for the admin's approval.
5. Make yourself the admin, from the SQL Editor:
   ```sql
   update public.profiles set role = 'admin', status = 'active' where email = 'your@email.com';
   ```

### Adding a new agent

1. The agent opens the site, clicks **הרשמה** (Sign up), and fills in name, phone, email and password.
2. The admin gets a notification in the bell and an email (see [Yad2 alerts and sign-up emails](#4-yad2-alerts-and-sign-up-emails)). On the **ניהול סוכנים** (Manage agents) screen, click **אישור** (Approve) or **דחייה** (Reject).
3. Until approval, the agent only sees an "account pending approval" screen, and the database returns no data to them. Once approved, the system opens up for them automatically.

An account created by hand in Supabase (**Authentication → Users → Add user**) also starts as pending, and is approved on the same screen.

Approve or block through the SQL Editor:
```sql
update public.profiles set status = 'active' where email = 'agent@example.com';   -- approve
update public.profiles set status = 'rejected' where email = 'agent@example.com'; -- block
```

To make a user an admin:
```sql
update public.profiles set role = 'admin' where email = 'agent@example.com';
```

### Changing a user's password

In the SQL Editor, replace the email and the password, then click Run:
```sql
update auth.users
set encrypted_password = extensions.crypt('the-new-password', extensions.gen_salt('bf')),
    updated_at = now()
where email = 'agent@example.com';
```
`UPDATE 1` means the password was changed. `UPDATE 0` means the email wasn't found.

### Deleting the sample data

All sample records have an id starting with `dddddddd`. To delete them, run in the SQL Editor:
```sql
delete from public.notifications where id::text like 'dddddddd%';
delete from public.financial_transactions where id::text like 'dddddddd%';
delete from public.tasks where id::text like 'dddddddd%';
delete from public.buyer_property_viewings where id::text like 'dddddddd%';
delete from public.buyers where id::text like 'dddddddd%';
delete from public.properties where id::text like 'dddddddd%';
delete from public.candidates where id::text like 'dddddddd%';
delete from auth.users where id::text like 'dddddddd%';   -- the sample agents
```

## 2. Running locally

**Server:**
```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env   # fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
.venv/bin/uvicorn app.main:app --reload --port 8000
```

**Website:**
```bash
cd frontend
npm install
cp .env.example .env.local   # fill in the Supabase URL and the publishable key
npm run dev                  # http://localhost:3000
```

## 3. Deploying to Railway

The system runs in a Railway project called `remax-crm`, in the Europe (Netherlands) region. Each service is connected to the `matanshneor/remax-crm` repository and redeploys automatically on every push to `main`. The settings live in each service on Railway, not in files in the code.

| Service | Root Directory | Start command | Healthcheck | Environment variables |
|---|---|---|---|---|
| frontend | `/frontend` | `npm run start -- -p $PORT` | `/login` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL` |
| backend | `/backend` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | `/health` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGINS` (the frontend's URL) |
| daily-digest | `/backend` | `python -m app.jobs.daily_digest` · Cron `0 5,6 * * *` | — | Same as backend |

After deploying, in Supabase under **Authentication → URL Configuration**, set the Site URL to the frontend's Railway address. Without it, links in the "forgot password" emails point to localhost.

The daily job runs every day at 08:00 Israel time, summer and winter. The cron fires at 05:00 and 06:00 UTC, and the job only works on the run that lands on 08:00 in Israel (set `DAILY_DIGEST_FORCE=1` to run it at any hour by hand). It creates notifications for:
- Exclusivity ending in 7 days and in 1 day.
- Eviction dates in 14, 7 and 1 days.
- Tasks that became overdue (each one once).

## 4. Yad2 alerts and sign-up emails

New Yad2 listings reach the **מאגר יד 2** (Yad2 pool) in two ways:
- **Automatic:** Yad2 alert emails arrive at `remaxtabu@gmail.com`. A Google Apps Script in that mailbox (`docs/yad2-gmail-script.gs`) sends them every hour to the `yad2-email-intake` edge function, which adds the listings to the pool. Only listings in the office's area (פסגת זאב) are added, and nothing already in the pool or among the sellers. Handled emails get the Gmail label `נקלט ל-CRM`.
- **By hand (admin only):** on the **גיוס נכסים חדשים** page, paste a table copied from Yad2 Plus. Existing listings get their phone number updated.

The same script also checks every 5 minutes for new agents waiting for approval, and emails the admins about each one, once.

Setup:
1. Deploy the function: `supabase functions deploy yad2-email-intake` (it's set to `verify_jwt = false` in `supabase/config.toml`; it checks its own key instead).
2. Pick a secret key and save its SHA-256 in the database:
   ```sql
   insert into public.intake_keys (name, key_sha256)
   values ('gmail-script', encode(extensions.digest('the-secret-key', 'sha256'), 'hex'));
   ```
3. In `remaxtabu@gmail.com`, open [script.google.com](https://script.google.com), create a project, paste `docs/yad2-gmail-script.gs`, put the secret key in `CRM_KEY`, choose the `install` function and click Run (once only).

## 5. Ad tool

The ad-making tool is a single static page inside this project: `frontend/public/ad-tool/index.html`, served at `/ad-tool` on the same site. It is open without signing in (the CRM itself still requires it). The **יצירת מודעה** button on a seller opens it with the property already filled in.

The agents on the ads come from the CRM's team list (**צוות המשרד**), through `GET /api/ad-agents` (the database function `ad_tool_agents()`). It returns only what every ad already prints: name, role, license, phone and photo. Adding, editing and removing agents is done only by the admin, on the **ניהול סוכנים** page (section "סוכני המשרד", the same list the team page shows, manager first, each person marked active or not); the **צוות המשרד** page is read-only for everyone. A change there shows in the ad tool too; there is no separate agents file.

Each team-list row has a `gender` (chosen by the agent at sign-up, required, and fixable by the admin), a `license` number and a `photo_url`. The title printed on the ad (סוכן / סוכנת נדל"ן) follows from the gender; until an agent has one, the old stored `role` is used. Photos are cut-out portraits (transparent background, 800×800). The original nine are in `frontend/public/ad-tool/images/`.

## 6. Phone calendar

Each user can subscribe their phone calendar to their own open tasks, from the **משימות** (Tasks) page. The link holds a personal secret token. Creating a new link turns off the old one. The feed is served by `frontend/src/app/api/calendar/[token]`.

## Permission rules (enforced in the database)

- **Deleting:** admin only. An agent can only change a status, for example to "frozen" or "not relevant".
- **Exporting:** admin only, through `GET /export/{table}` on the server. Export can't be blocked in the database itself, because anyone who can see data can also copy it.
- **Sellers (properties):**
  - Each agent sees and edits only the sellers they recruited, including the seller's contact details. The admin sees all of them.
  - For matching buyers, every agent sees the office's offered properties (on the market, with an agreement) without the address or the seller, plus whose listing it is.
  - Only the admin sets or changes a seller's recruiting agent. Exclusivity can be changed only by the recruiting agent or the admin.
- **Buyers:** each agent sees and edits only their own buyers. The admin sees all of them, including unassigned leads, and is the only one who assigns a buyer to an agent or moves a buyer between agents. Viewing history is hidden the same way.
- **Duplicate buyer:** the phone check runs across the whole office. An agent only sees which agent handles the existing buyer, without the buyer's name or details.
- **Yad2 pool:** every approved user sees and works the whole pool. Only the admin deletes listings and imports from Yad2 Plus.
- **Deals:**
  - Only the admin records a closed deal: the agent, how much the office received, and the agent's percentage. The agent's default percentage fills in automatically.
  - Each deal automatically creates an income entry (the full commission) and an expense entry ("payment to agent") in the bookkeeping. Both update and get deleted together with the deal.
  - Each agent sees only their own deals under "העסקאות שלי" (My deals).
- **Tasks:** a personal list. Everyone, including the admin, sees only their own tasks, and you can't assign a task to someone else.
- **Finances and candidates:** admin only, including attached files (receipts and CVs).
