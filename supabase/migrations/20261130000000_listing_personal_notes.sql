-- =============================================================================
-- "מאגר יד 2": notes on a listing are personal
-- =============================================================================
-- Everything an agent does with a listing is their own (opened, copied, not relevant, and now
-- their notes), so each agent writes notes that only they can see.
-- market_listings.notes is not touched: it holds the text that came with the ad (its description,
-- and "נקלט מיד 2 פלוס …" from the import), shared by everyone. The app now shows it as
-- "תיאור המודעה".
-- =============================================================================

create table if not exists public.market_listing_notes (
  listing_id uuid not null references public.market_listings (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  notes      text not null check (btrim(notes) <> ''),
  updated_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
comment on table public.market_listing_notes is 'A user''s own notes on a "מאגר יד 2" listing. Only that user sees them.';
comment on column public.market_listings.notes is 'Text that came with the ad (description, import marks). Shared; shown as "תיאור המודעה".';

create index if not exists market_listing_notes_listing_idx on public.market_listing_notes (listing_id);

create trigger market_listing_notes_updated_at before update on public.market_listing_notes
  for each row execute function public.set_updated_at();

alter table public.market_listing_notes enable row level security;

create policy "listing notes: own read" on public.market_listing_notes
  for select to authenticated using (user_id = (select auth.uid()) and (select public.is_active()));
create policy "listing notes: own insert" on public.market_listing_notes
  for insert to authenticated with check (user_id = (select auth.uid()) and (select public.is_active()));
create policy "listing notes: own update" on public.market_listing_notes
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active()))
  with check (user_id = (select auth.uid()) and (select public.is_active()));
create policy "listing notes: own delete" on public.market_listing_notes
  for delete to authenticated using (user_id = (select auth.uid()) and (select public.is_active()));
