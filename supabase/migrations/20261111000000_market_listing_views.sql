-- =============================================================================
-- "מאגר יד 2": which listings each user has opened
-- =============================================================================
-- A listing shows "חדשה" on its card until the signed-in user opens it once.
-- Personal: one agent opening it doesn't clear it for the others.
-- =============================================================================

create table public.market_listing_views (
  listing_id uuid not null references public.market_listings (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index market_listing_views_listing_idx on public.market_listing_views (listing_id);

alter table public.market_listing_views enable row level security;

-- Each user sees and records only their own views.
create policy "listing views: own read" on public.market_listing_views
  for select to authenticated using (user_id = (select auth.uid()) and (select public.is_active()));
create policy "listing views: own insert" on public.market_listing_views
  for insert to authenticated with check (user_id = (select auth.uid()) and (select public.is_active()));
