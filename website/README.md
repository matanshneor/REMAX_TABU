# Public website

The office's public listings site (https://remaxtabu.up.railway.app until a domain is set).

| Folder | What's in it |
|---|---|
| `frontend/` | The site: Next.js 16, Tailwind, Hebrew RTL |
| `backend/` | FastAPI with one open endpoint, `POST /public/leads` (the enquiry forms) |
| `docs/` | The site's specification (PDF), and how the home photo was cut into moving layers (`living-photo/`) |

The home page opens with the office (the balloon photo, the name and the line), then the list. A listing's page opens with its first photo on the whole screen, then the details, the contact card of **its own agent** and similar listings. "המשרד שלנו" shows the office in its own words, the manager, and the team (photo and name only).

## Which properties are on the site

Only the ones the manager put there. In the CRM, the manager alone has **העלאה לאתר** / **הורדה מהאתר** on a property (`properties.on_website`; the database refuses anyone else). Any agent's active property with at least one photo can go up, at any stage of the agreement with the seller. A property that is sold or frozen leaves by itself and does not come back by itself. Migration: `supabase/migrations/20261125000000_website_publish.sql`.

## How it works

- **Data:** the site reads with the publishable key, which can read only three views: `website_properties` (public fields, including the full address and the listing's agent; never the seller), `website_agents` (the team: name, title, phone, email, photo, license, a few words) and `website_agent` (the manager). Photos come through the site's `/media` route; the storage policy opens only photos listed on a property that is on the site.
- **Instant updates:** a trigger on `properties` (for a property that is on the site, or just left it) and on the team list posts to `/api/revalidate` through `pg_net`. The address and the shared secret are in Supabase Vault (`website_revalidate_url`, `website_revalidate_secret`); the secret matches `REVALIDATE_SECRET` on the frontend service. `select * from net._http_response order by created desc` shows the last calls. As a safety net the lists refresh every minute on their own (`LIFE` in `frontend/src/lib/data.ts`): a CRM change that lands while a new version of the site is going up reaches the version being replaced, and this heals it.
- **Enquiries:** the forms post to the website backend, `POST /public/leads` (hidden trap field and rate limits against spam). An enquiry about a listing goes to that listing's agent when they have a CRM account (the manager gets a copy), otherwise to the manager; a general enquiry goes to the manager. Each becomes a buyer (lead source "אתר", or a call-log entry on the agent's existing buyer with the same phone), a task linked to the property when it came from a listing page, a bell notification, and an email within a minute: Railway's plan blocks outbound SMTP, so the Gmail script (`supabase/gmail-script/`, function `emailLeads`, every minute) fetches notifications with `emailed_at` empty from the `website-lead-emails` edge function, sends them, and marks them sent.
- **Texts to fill in:** `frontend/src/content/site.ts` (office address, opening hours, the office's words, the manager's words). A text still marked `TODO` shows on the site in a dashed frame.
- **Agents' few words:** each agent writes theirs on **החשבון שלי** in the CRM (`set_my_website_bio`), the manager can edit any in the team panel. They are not shown on the site today (the owner asked for photo and name only), but the data is kept.
- **Link from the CRM:** a listing that is on the site has "העתקת קישור לאתר" in its panel, and its WhatsApp message carries the same link (`crm/frontend/src/lib/website.ts`: the rule mirrors the view). The link is `/properties/<listing id>`. `/p/<listing id>` (the home page opening with that listing) still works.
- **Motion:** one system, described at the top of `frontend/src/app/globals.css` (five durations, one easing family, only opacity and transform). The photo of a listing travels from its card into its page (`frontend/src/lib/handoff.ts`, `components/motion/`); content rises in on scroll (`Reveal`); everything is off for visitors who ask for reduced motion. The `::view-transition { left: 0; right: auto }` rule there is required: without it React's view transitions draw off screen in a right-to-left page.
- **The living photo on the home page:** the balloon leans in the wind and the clouds drift (`frontend/src/components/motion/living-hero.tsx`, styles under `.living` in `globals.css`). It is the home photo cut into three layers in `frontend/public/hero/` (what is behind the balloon, the sky, the balloon), laid exactly over `home-hero.jpg`. The layers load after the page, and not at all for visitors who ask for reduced motion or to save data: they keep the still photo. If the photo is ever replaced, the layers no longer match it: cut them again from the new photo (`docs/living-photo/`) and update the boxes at the top of the component, or take `<LivingHero />` out of `home-content.tsx` and the photo is simply still.

## Running locally

```bash
cd website/backend  && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && cp .env.example .env
.venv/bin/uvicorn app.main:app --reload --port 8000
cd website/frontend && npm install && cp .env.example .env.local && npm run dev -- -p 3001
```

Backend tests: `cd website/backend && python -m pytest tests`. Database tests: `supabase/tests/website_test.sql`.

## Settings on Railway

| Service | Variables |
|---|---|
| website-frontend | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL` (the website backend), `AD_TOOL_URL` (where the agent photos are), `REVALIDATE_SECRET` |
| website-backend | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGINS` and `WEBSITE_URL` (the site's address) |

**If the site's address changes** (a new Railway name, or a real domain), these must follow, or enquiries are blocked and updates stop being instant: `NEXT_PUBLIC_SITE_URL` on the frontend; `CORS_ORIGINS` and `WEBSITE_URL` on the backend; and the Vault secret `website_revalidate_url` (`select vault.update_secret(id, 'https://<address>/api/revalidate') from vault.secrets where name = 'website_revalidate_url';`). The CRM's links to the site follow `NEXT_PUBLIC_WEBSITE_URL` on the CRM frontend (default: the live address in `crm/frontend/src/lib/website.ts`).
