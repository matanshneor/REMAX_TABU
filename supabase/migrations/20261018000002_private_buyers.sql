-- Buyers are private per agent: an agent sees and edits only the buyers assigned to
-- them; only the admin sees everyone (including unassigned leads) and assigns owners.
-- Policies are altered in place (no drops).

alter policy "buyers: read all" on public.buyers rename to "buyers: read own or admin";
alter policy "buyers: read own or admin" on public.buyers
  using (owner_agent_id = (select auth.uid()) or (select public.is_admin()));

-- An agent's new buyer always belongs to them (no unassigned or someone-else's buyers).
alter policy "buyers: insert unclaimed or for self" on public.buyers rename to "buyers: insert own";
alter policy "buyers: insert own" on public.buyers
  with check (owner_agent_id = (select auth.uid()) or (select public.is_admin()));

-- Only the admin can reassign or release a buyer.
alter policy "buyers: update if unclaimed or owner" on public.buyers rename to "buyers: update own";
alter policy "buyers: update own" on public.buyers
  using (owner_agent_id = (select auth.uid()) or (select public.is_admin()))
  with check (owner_agent_id = (select auth.uid()) or (select public.is_admin()));

-- Viewings follow buyer visibility (the subquery runs under the caller's buyers RLS).
alter policy "viewings: read all" on public.buyer_property_viewings rename to "viewings: read for visible buyers";
alter policy "viewings: read for visible buyers" on public.buyer_property_viewings
  using (exists (select 1 from public.buyers b where b.id = buyer_id));

alter policy "viewings: insert as self" on public.buyer_property_viewings
  with check (
    (select public.is_admin())
    or (agent_id = (select auth.uid()) and exists (select 1 from public.buyers b where b.id = buyer_id))
  );

-- Duplicate detection must still work across agents (to prevent two agents working the
-- same lead), so it runs as SECURITY DEFINER — but it only reveals the buyer's name and
-- id to someone who could see that buyer anyway; others learn just the handling agent.
create or replace function public.find_buyers_by_phone(p_phone text, p_exclude uuid default null)
returns table (id uuid, full_name text, owner_agent_id uuid, status public.buyer_status)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when visible then b.id end,
    case when visible then b.full_name end,
    b.owner_agent_id,
    b.status
  from public.buyers b
  cross join lateral (
    select (b.owner_agent_id = (select auth.uid()) or public.is_admin()) as visible
  ) v
  where (select auth.uid()) is not null
    and length(public.phone_key(p_phone)) = 9
    and public.phone_key(b.phone) = public.phone_key(p_phone)
    and (p_exclude is null or b.id <> p_exclude)
  order by b.updated_at desc
  limit 5;
$$;

revoke execute on function public.find_buyers_by_phone(text, uuid) from public, anon;
