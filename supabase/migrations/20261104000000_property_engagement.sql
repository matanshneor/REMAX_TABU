-- =============================================================================
-- סוג התקשרות with the seller: בלעדיות / הסכמה / בתהליך גיוס
-- =============================================================================
-- Separate from status (פעיל / מוקפא / נמכר — whether it's on the market):
--   * exclusive  — exclusivity agreement; keeps is_exclusive on (and the other way round),
--   * consent    — the seller agreed to market it, without exclusivity,
--   * recruiting — still being recruited: not offered to buyers yet (no matches, no alerts).
-- Existing properties: exclusive if marked so, otherwise consent.
-- =============================================================================

create type public.property_engagement as enum ('exclusive', 'consent', 'recruiting');

alter table public.properties
  add column engagement public.property_engagement not null default 'consent';

update public.properties set engagement = 'exclusive' where is_exclusive;

-- Keep "בלעדיות" (is_exclusive) and the engagement type in step, whichever was changed.
create or replace function public.sync_property_engagement()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.engagement = 'exclusive' then
      new.is_exclusive := true;
    elsif new.is_exclusive then
      new.engagement := 'exclusive';
    end if;
  elsif new.engagement is distinct from old.engagement then
    new.is_exclusive := new.engagement = 'exclusive';
  elsif new.is_exclusive is distinct from old.is_exclusive then
    if new.is_exclusive then
      new.engagement := 'exclusive';
    elsif new.engagement = 'exclusive' then
      new.engagement := 'consent';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_property_engagement() from public, anon, authenticated;

-- Named to run before properties_guard (BEFORE triggers run alphabetically), so the guard
-- sees the final is_exclusive.
create trigger a_properties_sync_engagement before insert or update of engagement, is_exclusive
  on public.properties
  for each row execute function public.sync_property_engagement();

-- The engagement type is part of the agreement: like exclusivity, only the recruiting agent
-- or the admin may change it.
create or replace function public.guard_property_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_trusted boolean := public.is_system() or public.is_admin()
                       or coalesce(current_setting('app.recruiter_handover', true), '') = 'on';
begin
  if not v_trusted
     and (new.recruiting_agent_id is distinct from old.recruiting_agent_id
          or new.recruiter_id is distinct from old.recruiter_id) then
    raise exception 'רק מנהל המשרד יכול לשנות את הסוכן המגייס'
      using errcode = '42501';
  end if;

  if not (v_trusted or old.recruiting_agent_id = (select auth.uid())) then
    if new.is_exclusive is distinct from old.is_exclusive
       or new.engagement is distinct from old.engagement
       or new.exclusivity_start is distinct from old.exclusivity_start
       or new.exclusivity_end is distinct from old.exclusivity_end then
      raise exception 'רק הסוכן המגייס או מנהל יכולים לשנות בלעדיות או סוג התקשרות'
        using errcode = '42501';
    end if;
  end if;

  if new.current_price is distinct from old.current_price then
    new.previous_price := old.current_price;
  end if;
  return new;
end;
$$;

-- Offered to buyers only once there's an agreement (exclusivity or consent).
create or replace function public.property_fits_buyer(b public.buyers, p public.properties)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p.status = 'active'
    and p.engagement <> 'recruiting'
    and (cardinality(b.preferred_neighborhoods) = 0 or p.neighborhood = any (b.preferred_neighborhoods))
    -- Buyers may go up to 5% over their stated budget.
    and (b.max_budget is null or (p.current_price is not null and p.current_price <= b.max_budget * 1.05))
    and (b.min_rooms is null or (p.rooms is not null and p.rooms >= b.min_rooms))
    and ((b.floor_min is null and b.floor_max is null)
         or (p.floor is not null
             and (b.floor_min is null or p.floor >= b.floor_min)
             and (b.floor_max is null or p.floor <= b.floor_max)))
    and (nullif(b.property_type, '') is null or nullif(p.property_type, '') is null or b.property_type = p.property_type)
    and (b.needs_safe_room <> 'must' or p.has_safe_room)
    and (b.needs_elevator <> 'must' or p.has_elevator)
    and (b.needs_balcony <> 'must' or p.has_balcony);
$$;

-- A property leaving "בתהליך גיוס" can start matching buyers: notify then too.
drop trigger properties_notify_matches on public.properties;
create trigger properties_notify_matches
  after insert or update of status, engagement, current_price, neighborhood, rooms, floor, property_type,
                            has_safe_room, has_elevator, has_balcony, balcony_count, balcony_sqm
  on public.properties
  for each row execute function public.notify_property_matches();
