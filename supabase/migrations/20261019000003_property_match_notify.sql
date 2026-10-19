-- =============================================================================
-- Bell notification when a seller starts matching someone's buyers
-- =============================================================================
-- Fires when a property is added, and when an edit (price drop, back to active,
-- details fixed) makes it match buyers it didn't match before. Each agent gets one
-- notification listing their newly matching buyers; unassigned buyers go to the admins.
-- The hard requirements mirror matchBuyerToProperty() in frontend/src/lib/matching.ts.
-- =============================================================================

create or replace function public.property_fits_buyer(b public.buyers, p public.properties)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p.status = 'active'
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

revoke execute on function public.property_fits_buyer(public.buyers, public.properties) from public, anon;

create or replace function public.notify_property_matches()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text := concat_ws(', ', nullif(concat_ws(' ', new.street, new.house_number), ''), new.neighborhood, new.city);
  v_price_drop boolean := tg_op = 'UPDATE' and new.current_price < old.current_price;
begin
  if new.status <> 'active' then
    return new;
  end if;

  with fresh as (
    -- Active buyers this property fits now, and (on edits) didn't fit before.
    select b.id, b.full_name, b.owner_agent_id
      from public.buyers b
     where b.status in ('new', 'hot', 'warm')
       and public.property_fits_buyer(b, new)
       and (tg_op = 'INSERT' or not public.property_fits_buyer(b, old))
  ),
  recipients as (
    select f.owner_agent_id as recipient_id, f.full_name
      from fresh f
     where f.owner_agent_id is not null
    union all
    select a.id, f.full_name
      from fresh f
      join public.profiles a on a.role = 'admin'
     where f.owner_agent_id is null
  ),
  grouped as (
    select r.recipient_id, count(*) as n, string_agg(r.full_name, ', ' order by r.full_name) as names
      from recipients r
      join public.profiles p on p.id = r.recipient_id and p.status = 'active'
     group by r.recipient_id
  )
  insert into public.notifications (recipient_id, kind, title, body, link)
  select g.recipient_id,
         'property_match',
         case
           when v_price_drop then 'ירידת מחיר — מוכר מתאים עכשיו ל' || case when g.n = 1 then 'קונה שלך' else g.n || ' מהקונים שלך' end
           when tg_op = 'INSERT' then 'מוכר חדש מתאים ל' || case when g.n = 1 then 'קונה שלך' else g.n || ' מהקונים שלך' end
           else 'מוכר מתאים עכשיו ל' || case when g.n = 1 then 'קונה שלך' else g.n || ' מהקונים שלך' end
         end,
         v_label || ' · ' || g.names,
         '/properties?open=' || new.id
    from grouped g;

  return new;
end;
$$;

revoke execute on function public.notify_property_matches() from public, anon, authenticated;

create trigger properties_notify_matches
  after insert or update of status, current_price, neighborhood, rooms, floor, property_type,
                            has_safe_room, has_elevator, has_balcony
  on public.properties
  for each row execute function public.notify_property_matches();
