-- Duplicate-buyer detection by phone.
-- Phones are compared by their last 9 digits, so 050-1234567, 0501234567 and
-- +972-50-123-4567 are all the same number.

create or replace function public.phone_key(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 9), '');
$$;

create index buyers_phone_key_idx on public.buyers (public.phone_key(phone));

-- SECURITY INVOKER: buyers are readable by every signed-in agent anyway.
create or replace function public.find_buyers_by_phone(p_phone text, p_exclude uuid default null)
returns table (id uuid, full_name text, owner_agent_id uuid, status public.buyer_status)
language sql
stable
security invoker
set search_path = ''
as $$
  select b.id, b.full_name, b.owner_agent_id, b.status
  from public.buyers b
  where length(public.phone_key(p_phone)) = 9
    and public.phone_key(b.phone) = public.phone_key(p_phone)
    and (p_exclude is null or b.id <> p_exclude)
  order by b.updated_at desc
  limit 5;
$$;

revoke execute on function public.phone_key(text) from public, anon;
revoke execute on function public.find_buyers_by_phone(text, uuid) from public, anon;
