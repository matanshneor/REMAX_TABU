-- =============================================================================
-- Call log per buyer (יומן שיחות): short dated entries, newest first
-- =============================================================================
-- Visible to whoever can see the buyer (the owning agent and the admin — buyers'
-- own RLS decides). Each entry belongs to its author, who may edit or delete it;
-- the admin may delete any entry.
-- =============================================================================

create table public.buyer_notes (
  id          uuid primary key default gen_random_uuid(),
  buyer_id    uuid not null references public.buyers (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null default auth.uid(),
  body        text not null check (length(trim(body)) > 0),
  created_at  timestamptz not null default now()
);

create index buyer_notes_buyer_idx on public.buyer_notes (buyer_id, created_at desc);
create index buyer_notes_author_idx on public.buyer_notes (author_id);

alter table public.buyer_notes enable row level security;

-- The subquery on buyers runs under the buyers' RLS, so "can see the buyer" is reused as is.
create policy "buyer notes: read with buyer" on public.buyer_notes
  for select to authenticated
  using (exists (select 1 from public.buyers b where b.id = buyer_id));
create policy "buyer notes: add as self" on public.buyer_notes
  for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (select 1 from public.buyers b where b.id = buyer_id));
create policy "buyer notes: edit own" on public.buyer_notes
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));
create policy "buyer notes: delete own or admin" on public.buyer_notes
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));
create policy "approved only" on public.buyer_notes
  as restrictive for all to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));
