-- =============================================================================
-- "הערות אישיות" on a seller
-- =============================================================================
-- Each agent writes their own notes on a seller; only they see them (the manager sees everyone's).
-- This replaces "הערות על המוכר" (property_owner_details.notes), which sat on the seller and so
-- showed to everyone who sees it, and could be changed by anyone who can edit it.
-- =============================================================================

create table if not exists public.property_personal_notes (
  property_id uuid not null references public.properties (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  notes       text not null check (btrim(notes) <> ''),
  updated_at  timestamptz not null default now(),
  primary key (user_id, property_id)
);
comment on table public.property_personal_notes is 'A user''s own notes on a seller. Only that user (and the manager) can read them.';
comment on column public.property_owner_details.notes is 'Old "הערות על המוכר": moved to property_personal_notes; no longer used by the app.';

create index if not exists property_personal_notes_property_idx on public.property_personal_notes (property_id);

create trigger property_personal_notes_updated_at before update on public.property_personal_notes
  for each row execute function public.set_updated_at();

alter table public.property_personal_notes enable row level security;

create policy "personal notes: own read" on public.property_personal_notes
  for select to authenticated using (user_id = (select auth.uid()) and (select public.is_active()));
create policy "personal notes: admin read" on public.property_personal_notes
  for select to authenticated using ((select public.is_admin()));
-- Only on a seller the user can see.
create policy "personal notes: own insert" on public.property_personal_notes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_active())
    and exists (select 1 from public.properties p where p.id = property_id));
create policy "personal notes: own update" on public.property_personal_notes
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active()))
  with check (user_id = (select auth.uid()) and (select public.is_active()));
create policy "personal notes: own delete" on public.property_personal_notes
  for delete to authenticated using (user_id = (select auth.uid()) and (select public.is_active()));

-- The notes written so far become the recruiting agent's personal notes.
insert into public.property_personal_notes (property_id, user_id, notes)
select o.property_id, p.recruiting_agent_id, btrim(o.notes)
  from public.property_owner_details o
  join public.properties p on p.id = o.property_id
 where nullif(btrim(o.notes), '') is not null and p.recruiting_agent_id is not null
on conflict do nothing;

-- A seller with no recruiting agent had ad text in it: that is the property's description when it has none,
-- else the first manager's personal note.
update public.properties p
   set description = btrim(o.notes)
  from public.property_owner_details o
 where o.property_id = p.id and p.recruiting_agent_id is null
   and nullif(btrim(o.notes), '') is not null
   and nullif(btrim(coalesce(p.description, '')), '') is null;

insert into public.property_personal_notes (property_id, user_id, notes)
select o.property_id, (select id from public.profiles where role = 'admin' order by created_at limit 1), btrim(o.notes)
  from public.property_owner_details o
  join public.properties p on p.id = o.property_id
 where nullif(btrim(o.notes), '') is not null and p.recruiting_agent_id is null
   and p.description is distinct from btrim(o.notes)
   and exists (select 1 from public.profiles where role = 'admin')
on conflict do nothing;
