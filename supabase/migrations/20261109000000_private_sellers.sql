-- =============================================================================
-- Sellers are private to their recruiting agent; the admin sees all
-- =============================================================================
-- Like buyers: an agent reads only the properties they recruited (and their sellers'
-- details). The office still works together on matches: office_listings() gives every
-- approved user the offered properties (on the market, with an agreement) WITHOUT the
-- address or the seller — enough to match buyers and to know whose listing it is.
-- Match alerts to other agents' buyers describe the property the same way.
-- =============================================================================

alter policy "properties: read all" on public.properties rename to "properties: read own or admin";
alter policy "properties: read own or admin" on public.properties
  using (recruiting_agent_id = (select auth.uid()) or (select public.is_admin()));

-- Seller details follow the property (the subquery is itself limited to visible properties).
alter policy "owner details: read all" on public.property_owner_details rename to "owner details: read with property";
alter policy "owner details: read with property" on public.property_owner_details
  using (exists (select 1 from public.properties p where p.id = property_id));

-- The office's offered properties for matching: facts and whose listing it is, no address or seller.
create or replace function public.office_listings()
returns table (
  id uuid,
  recruiting_agent_id uuid,
  agent_name text,
  status public.property_status,
  engagement public.property_engagement,
  property_type text,
  neighborhood text,
  city text,
  rooms numeric,
  size_sqm numeric,
  floor integer,
  current_price numeric,
  has_balcony boolean,
  has_elevator boolean,
  has_safe_room boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.recruiting_agent_id, coalesce(o.full_name, pr.full_name),
         p.status, p.engagement, p.property_type, p.neighborhood, p.city,
         p.rooms, p.size_sqm, p.floor, p.current_price,
         p.has_balcony, p.has_elevator, p.has_safe_room
    from public.properties p
    left join public.office_agents o on o.id = p.recruiter_id
    left join public.profiles pr on pr.id = p.recruiting_agent_id
   where public.is_active()
     and p.status = 'active'
     and p.engagement <> 'recruiting';
$$;

revoke execute on function public.office_listings() from public, anon;
grant execute on function public.office_listings() to authenticated;

-- Match alerts: the property's own agent and the admin get the address and a link to the
-- property; other agents get its description and whose listing it is, and a link to their buyer.
create or replace function public.notify_property_matches()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text := concat_ws(', ', nullif(concat_ws(' ', new.street, new.house_number), ''), new.neighborhood, new.city);
  v_brief text := concat_ws(', ',
                   nullif(concat_ws(' ', new.property_type, new.rooms::text || ' חד׳'), ''),
                   new.neighborhood,
                   to_char(new.current_price, 'FM9,999,999,999') || ' ₪');
  v_agent text := coalesce((select o.full_name from public.office_agents o where o.id = new.recruiter_id),
                           (select p.full_name from public.profiles p where p.id = new.recruiting_agent_id));
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
    select f.owner_agent_id as recipient_id, f.id as buyer_id, f.full_name
      from fresh f
     where f.owner_agent_id is not null
    union all
    select a.id, f.id, f.full_name
      from fresh f
      join public.profiles a on a.role = 'admin'
     where f.owner_agent_id is null
  ),
  grouped as (
    select r.recipient_id, p.role, count(*) as n, min(r.buyer_id::text) as one_buyer,
           string_agg(r.full_name, ', ' order by r.full_name) as names
      from recipients r
      join public.profiles p on p.id = r.recipient_id and p.status = 'active'
     group by r.recipient_id, p.role
  )
  insert into public.notifications (recipient_id, kind, title, body, link)
  select g.recipient_id,
         'property_match',
         case
           when v_price_drop then 'ירידת מחיר — מוכר מתאים עכשיו ל' || case when g.n = 1 then 'קונה שלך' else g.n || ' מהקונים שלך' end
           when tg_op = 'INSERT' then 'מוכר חדש מתאים ל' || case when g.n = 1 then 'קונה שלך' else g.n || ' מהקונים שלך' end
           else 'מוכר מתאים עכשיו ל' || case when g.n = 1 then 'קונה שלך' else g.n || ' מהקונים שלך' end
         end,
         case
           when g.role = 'admin' or g.recipient_id = new.recruiting_agent_id then v_label || ' · ' || g.names
           else v_brief || ' · אצל ' || coalesce(v_agent, 'סוכן במשרד') || ' · ' || g.names
         end,
         case
           when g.role = 'admin' or g.recipient_id = new.recruiting_agent_id then '/properties?open=' || new.id
           when g.n = 1 then '/buyers?open=' || g.one_buyer
           else '/buyers'
         end
    from grouped g;

  return new;
end;
$$;
