# REMAX_TABU

RE/MAX טאבו נכסים: three products on one database.

```
REMAX_TABU/
├── crm/        The office's internal system
│   ├── frontend/   screens (Next.js)
│   └── backend/    data export for the admin + the daily notifications job (FastAPI)
├── website/    The public listings site
│   ├── frontend/   the site (Next.js)
│   ├── backend/    the enquiry forms, POST /public/leads (FastAPI)
│   └── docs/       the site's specification
├── ad-tool/    The ad-making tool (one static page, no server of its own)
│   └── frontend/
├── supabase/   The database all three share: migrations, edge functions, tests, the Gmail script
└── brand/      Logos, the balloon, the home page photo (originals), brand guidelines
```

Each product has its own README: [crm](crm/README.md), [website](website/README.md), [ad-tool](ad-tool/README.md), and the database in [supabase](supabase/README.md) (start there for a new setup).

## Railway

One project, `remax-crm` (Europe, Netherlands), all services connected to the `matanshneor/remax-crm` repository and redeployed on every push to `main`. The settings live in each service on Railway, not in files. A service redeploys only when its own folder changes (watch paths).

| Service | Root directory | Start command | Healthcheck | Variables |
|---|---|---|---|---|
| frontend (CRM) | `/crm/frontend` | `npm run start -- -p $PORT` | `/login` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL` (CRM backend), `AD_TOOL_ORIGIN` (the ad tool service) |
| backend (CRM) | `/crm/backend` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | `/health` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGINS` (the CRM's address) |
| daily-digest (CRM) | `/crm/backend` | `python -m app.jobs.daily_digest` · cron `0 5,6 * * *` | none | as the CRM backend |
| website (frontend) | `/website/frontend` | `npm run start -- -p $PORT` | `/about` | see [website/README.md](website/README.md#settings-on-railway) |
| website-backend | `/website/backend` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | `/health` | see [website/README.md](website/README.md#settings-on-railway) |
| ad-tool | `/ad-tool/frontend` | `npm start` | `/` | none |

Addresses: the CRM is `remax-tabu.up.railway.app` and the website is `remaxtabu.up.railway.app` (one hyphen apart; they stay as they are because links and the installed app depend on them). The ad tool is reached at `/ad-tool` on the CRM's address as well as on its own.

## Working on it

Each product runs on its own, see its README. Browser tests of the website are not in the repository yet.
