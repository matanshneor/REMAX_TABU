-- =============================================================================
-- "מאגר יד 2": every agent copies a listing to their own sellers
-- =============================================================================
-- Before: "העבר למוכרים שלי" moved a listing out of the pool for everyone, and "לא רלוונטי"
-- hid it for everyone. Now the pool stays open to the whole office:
--   * "העתק למוכרים שלי" creates the agent's own seller from the listing
--     (properties.source_listing_id). Any number of agents can copy the same listing, each
--     once. Sellers stay private, so nobody sees who else copied it; the manager does.
--   * "לא רלוונטי" is personal (market_listing_dismissals): it hides the listing only for
--     whoever marked it.
-- market_listings.status / property_id / assigned_to / dismissed_* are no longer written
-- by the app (kept as history).
-- =============================================================================

alter table public.properties
  add column if not exists source_listing_id uuid references public.market_listings (id) on delete set null;
comment on column public.properties.source_listing_id is
  'The "מאגר יד 2" listing this seller was copied from (one copy per agent).';

-- Sellers that were moved from the pool before this change.
update public.properties p
   set source_listing_id = l.id
  from public.market_listings l
 where l.property_id = p.id
   and p.source_listing_id is null;

create unique index if not exists properties_one_copy_per_agent
  on public.properties (source_listing_id, recruiting_agent_id)
  where source_listing_id is not null;

-- -----------------------------------------------------------------------------
-- "לא רלוונטי", per agent
-- -----------------------------------------------------------------------------
create table if not exists public.market_listing_dismissals (
  listing_id   uuid not null references public.market_listings (id) on delete cascade,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason       text not null check (btrim(reason) <> ''),
  dismissed_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
comment on table public.market_listing_dismissals is
  '"לא רלוונטי" in "מאגר יד 2": hides the listing only for the agent who marked it.';

create index if not exists market_listing_dismissals_listing_idx on public.market_listing_dismissals (listing_id);

alter table public.market_listing_dismissals enable row level security;

create policy "listing dismissals: own read" on public.market_listing_dismissals
  for select to authenticated using (user_id = (select auth.uid()) and (select public.is_active()));
create policy "listing dismissals: own insert" on public.market_listing_dismissals
  for insert to authenticated with check (user_id = (select auth.uid()) and (select public.is_active()));
create policy "listing dismissals: own delete" on public.market_listing_dismissals
  for delete to authenticated using (user_id = (select auth.uid()) and (select public.is_active()));

-- Listings marked "לא רלוונטי" so far stay hidden only for whoever marked them.
insert into public.market_listing_dismissals (listing_id, user_id, reason, dismissed_at)
select id, dismissed_by, coalesce(nullif(btrim(dismissed_reason), ''), 'לא צוין'), coalesce(dismissed_at, updated_at)
  from public.market_listings
 where status = 'not_interested' and dismissed_by is not null
on conflict do nothing;

-- Every listing is open in the pool again.
update public.market_listings
   set status = 'contacted'
 where status in ('added', 'not_interested');
