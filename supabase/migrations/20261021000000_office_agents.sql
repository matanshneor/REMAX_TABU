-- =============================================================================
-- Office team list (צוות המשרד): every agent of the office, signed up or not
-- =============================================================================
-- The admin keeps the list. When an agent signs up, their account is linked to
-- their row automatically by phone (last 9 digits) or email, so the list shows
-- who already uses the system. Every approved user can read the list.
-- =============================================================================

create table public.office_agents (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null check (length(trim(full_name)) > 0),
  phone       text,
  email       text,
  profile_id  uuid unique references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger office_agents_updated_at before update on public.office_agents
  for each row execute function public.set_updated_at();
create trigger office_agents_normalize_phone before insert or update of phone on public.office_agents
  for each row execute function public.normalize_phone();

-- A row added (or fixed) after the agent signed up links to the existing account.
create or replace function public.link_office_agent_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is null then
    select p.id into new.profile_id
      from public.profiles p
     where (public.phone_key(p.phone) = public.phone_key(new.phone)
            or lower(p.email) = lower(nullif(trim(new.email), '')))
       and not exists (select 1 from public.office_agents o where o.profile_id = p.id and o.id <> new.id)
     limit 1;
  end if;
  return new;
end;
$$;

revoke execute on function public.link_office_agent_row() from public, anon, authenticated;

-- Runs after normalize_phone (trigger names fire in alphabetical order).
create trigger office_agents_zz_link before insert or update of phone, email on public.office_agents
  for each row execute function public.link_office_agent_row();

-- An agent who signs up (or fixes their phone) links to their row in the list.
create or replace function public.link_profile_to_office_agent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.office_agents o where o.profile_id = new.id) then
    update public.office_agents o
       set profile_id = new.id
     where o.id = (
       select o2.id from public.office_agents o2
        where o2.profile_id is null
          and (public.phone_key(o2.phone) = public.phone_key(new.phone)
               or lower(o2.email) = lower(new.email))
        limit 1
     );
  end if;
  return new;
end;
$$;

revoke execute on function public.link_profile_to_office_agent() from public, anon, authenticated;

create trigger profiles_link_office_agent after insert or update of phone, email on public.profiles
  for each row execute function public.link_profile_to_office_agent();

alter table public.office_agents enable row level security;

create policy "office agents: read" on public.office_agents
  for select to authenticated using (true);
create policy "office agents: admin insert" on public.office_agents
  for insert to authenticated with check ((select public.is_admin()));
create policy "office agents: admin update" on public.office_agents
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "office agents: admin delete" on public.office_agents
  for delete to authenticated using ((select public.is_admin()));
create policy "approved only" on public.office_agents
  as restrictive for all to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));
