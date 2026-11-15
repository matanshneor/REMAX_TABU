-- =============================================================================
-- "שדר לכולם": the manager shares a seller with the whole office
-- =============================================================================
-- Sellers are private to their recruiting agent (20261109000000_private_sellers). The manager
-- can now broadcast any seller: every approved agent then sees it with the seller's details,
-- can edit it like their own, and gets a bell notification. Only the manager turns it on or off.
-- Who recruited it does not change, and the card says so.
-- =============================================================================

alter table public.properties
  add column if not exists broadcast boolean not null default false,
  add column if not exists broadcast_at timestamptz;
comment on column public.properties.broadcast is 'Shared with every agent ("שדר לכולם"). Set only by the manager.';
comment on column public.properties.broadcast_at is 'When it was last broadcast.';

-- Everyone reads broadcast sellers (and, through the existing policy, their seller details).
alter policy "properties: read own or admin" on public.properties
  using (recruiting_agent_id = (select auth.uid()) or (select public.is_admin()) or broadcast);

-- ...and edits them like their own, exclusive or not. The guard trigger still keeps the
-- recruiter, exclusivity and engagement to the recruiting agent and the manager.
alter policy "properties: update unless exclusive" on public.properties
  using (not is_exclusive or broadcast or recruiting_agent_id = (select auth.uid()) or (select public.is_admin()))
  with check (not is_exclusive or broadcast or recruiting_agent_id = (select auth.uid()) or (select public.is_admin()));

-- The seller's name and phone follow the same rule.
alter policy "owner details: insert if property editable" on public.property_owner_details
  with check (exists (
    select 1 from public.properties p
    where p.id = property_id
      and (not p.is_exclusive or p.broadcast or p.recruiting_agent_id = (select auth.uid()) or (select public.is_admin()))
  ));
alter policy "owner details: update if property editable" on public.property_owner_details
  using (exists (
    select 1 from public.properties p
    where p.id = property_id
      and (not p.is_exclusive or p.broadcast or p.recruiting_agent_id = (select auth.uid()) or (select public.is_admin()))
  ))
  with check (exists (
    select 1 from public.properties p
    where p.id = property_id
      and (not p.is_exclusive or p.broadcast or p.recruiting_agent_id = (select auth.uid()) or (select public.is_admin()))
  ));

-- Only the manager broadcasts or stops it. Turning it on stamps the time and notifies the office.
create or replace function public.guard_property_broadcast()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_was boolean := case when tg_op = 'UPDATE' then old.broadcast else false end;
begin
  if new.broadcast is distinct from v_was then
    if not (public.is_system() or public.is_admin()) then
      raise exception 'רק מנהל המשרד יכול לשדר נכס לכולם או להפסיק את השידור'
        using errcode = '42501';
    end if;
    if new.broadcast then
      new.broadcast_at := now();
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_property_broadcast() from public, anon, authenticated;

create or replace trigger guard_property_broadcast
  before insert or update on public.properties
  for each row execute function public.guard_property_broadcast();

create or replace function public.notify_property_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text := concat_ws(' · ',
                   nullif(concat_ws(', ', nullif(concat_ws(' ', new.street, new.house_number), ''), new.neighborhood, new.city), ''),
                   trim_scale(new.rooms)::text || ' חד׳',
                   to_char(new.current_price, 'FM9,999,999,999') || ' ₪');
begin
  if new.broadcast and (tg_op = 'INSERT' or not old.broadcast) then
    insert into public.notifications (recipient_id, kind, title, body, link)
    select p.id, 'property_broadcast', 'נכס חדש שודר למשרד', nullif(v_label, ''), '/properties?open=' || new.id
      from public.profiles p
     where p.status = 'active'
       and p.id is distinct from (select auth.uid());
  end if;
  return new;
end;
$$;

revoke execute on function public.notify_property_broadcast() from public, anon, authenticated;

create or replace trigger notify_property_broadcast
  after insert or update of broadcast on public.properties
  for each row execute function public.notify_property_broadcast();
