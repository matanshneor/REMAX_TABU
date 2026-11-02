-- =============================================================================
-- Calendar feed: the seller's name and phone, and the property's address as the location
-- =============================================================================
-- A task linked to a property now carries the seller (sellers are visible to every agent)
-- next to the buyer details it already had, and the property's address as the event
-- location, so the phone calendar can show a map and navigate there.
-- The return type changes, so the function is dropped and created again.
-- =============================================================================

drop function public.calendar_feed(text);

create function public.calendar_feed(p_token text)
returns table (
  id uuid,
  title text,
  description text,
  due_at timestamptz,
  updated_at timestamptz,
  related text,
  location text
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.title, t.description, t.due_at, t.updated_at,
         concat_ws(E'\n',
           case when b.id is not null then 'קונה: ' || b.full_name || coalesce(' (' || b.phone || ')', '') end,
           case when pr.id is not null then 'נכס: ' || concat_ws(', ', nullif(concat_ws(' ', pr.street, pr.house_number), ''), pr.city) end,
           case when nullif(concat(od.owner_name, od.owner_phone), '') is not null
                then 'מוכר: ' || concat_ws(' ', od.owner_name, '(' || od.owner_phone || ')') end,
           case when c.id is not null then 'מועמד: ' || c.full_name || coalesce(' (' || c.phone || ')', '') end),
         case when pr.id is not null then concat_ws(', ', nullif(concat_ws(' ', pr.street, pr.house_number), ''), pr.city) end
    from public.calendar_feeds f
    join public.profiles p on p.id = f.user_id and p.status = 'active'
    join public.tasks t on t.assigned_to = f.user_id
    left join public.buyers b on b.id = t.buyer_id and (b.owner_agent_id = f.user_id or p.role = 'admin')
    left join public.properties pr on pr.id = t.property_id
    left join public.property_owner_details od on od.property_id = pr.id
    left join public.candidates c on c.id = t.candidate_id and p.role = 'admin'
   where length(p_token) >= 32
     and f.token = p_token
     and t.due_at is not null
     and not t.is_done
     and t.due_at > now() - interval '60 days'
   order by t.due_at;
$$;

revoke execute on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon, authenticated;
