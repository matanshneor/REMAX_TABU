-- =============================================================================
-- מאגר יד2: new listings from Yad2 (private sellers) to call and recruit
-- =============================================================================
-- A work list separate from sellers (properties): listings arrive from Yad2's alert
-- e-mails (or are added by hand), an agent calls the owner, and if the owner wants the
-- office's service, "הוסף למוכרים" creates a seller and links it here.
-- Every approved user sees and works the whole pool; only the admin deletes.
-- =============================================================================

create type public.listing_status as enum ('new', 'contacted', 'not_interested', 'added');

create table public.market_listings (
  id            uuid primary key default gen_random_uuid(),
  source        text not null default 'יד2',
  url           text unique,                 -- the ad's link: the same ad never comes in twice
  title         text,
  property_type text,
  city          text,
  neighborhood  text,
  street        text,
  rooms         numeric(3, 1),
  size_sqm      numeric(7, 2),
  floor         integer,
  price         numeric(12, 0),
  advertiser    text,                        -- the name on the ad (a broker's, if any)
  phone         text,
  listed_at     timestamptz not null default now(),
  status        public.listing_status not null default 'new',
  assigned_to   uuid references public.profiles (id) on delete set null,
  notes         text,
  property_id   uuid references public.properties (id) on delete set null,
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index market_listings_status_idx on public.market_listings (status, listed_at desc);

create trigger market_listings_updated_at before update on public.market_listings
  for each row execute function public.set_updated_at();

alter table public.market_listings enable row level security;

create policy "market listings: active read" on public.market_listings
  for select to authenticated using ((select public.is_active()));
create policy "market listings: active insert" on public.market_listings
  for insert to authenticated with check ((select public.is_active()));
create policy "market listings: active update" on public.market_listings
  for update to authenticated using ((select public.is_active())) with check ((select public.is_active()));
create policy "market listings: admin delete" on public.market_listings
  for delete to authenticated using ((select public.is_admin()));
