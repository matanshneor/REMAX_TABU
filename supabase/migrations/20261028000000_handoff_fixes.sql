-- =============================================================================
-- Fixes before hand-over
-- =============================================================================
--   1. Removing someone from the team list keeps their buyers/sellers on their account.
--   2. Accounts link to the team list (and receive recruited work) only once approved,
--      so a pending sign-up can't claim a colleague's buyers by typing their phone.
--   3. Commission % is readable only by the admin (all) and by each agent (own).
--   4. The phone calendar feed shows buyer details only while the buyer is still yours.
-- =============================================================================

-- ---- 1. Team row removed: the account keeps the work ------------------------
create or replace function public.sync_recruiter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account uuid;
  v_old_account uuid;
begin
  if tg_table_name = 'properties' then
    v_account := new.recruiting_agent_id;
    v_old_account := case when tg_op = 'UPDATE' then old.recruiting_agent_id end;
  else
    v_account := new.owner_agent_id;
    v_old_account := case when tg_op = 'UPDATE' then old.owner_agent_id end;
  end if;

  -- The team row was deleted (on delete set null): only the recruiter label goes.
  if tg_op = 'UPDATE' and new.recruiter_id is null and old.recruiter_id is not null
     and not exists (select 1 from public.office_agents o where o.id = old.recruiter_id) then
    return new;
  end if;

  if (tg_op = 'INSERT' and new.recruiter_id is not null)
     or (tg_op = 'UPDATE' and new.recruiter_id is distinct from old.recruiter_id) then
    -- The recruiter was chosen: the account follows (null while they haven't signed up).
    v_account := (select o.profile_id from public.office_agents o where o.id = new.recruiter_id);
  elsif tg_op = 'INSERT' or v_account is distinct from v_old_account then
    -- The account was set directly: show their team row as the recruiter.
    new.recruiter_id := (select o.id from public.office_agents o where o.profile_id = v_account);
    return new;
  else
    return new;
  end if;

  if tg_table_name = 'properties' then
    new.recruiting_agent_id := v_account;
  else
    new.owner_agent_id := v_account;
  end if;
  return new;
end;
$$;

-- ---- 2. Link to the team list only when approved ----------------------------
create or replace function public.link_profile_to_office_agent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active'
     and not exists (select 1 from public.office_agents o where o.profile_id = new.id) then
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

-- Approval (status → active) now also triggers the link.
create or replace trigger profiles_link_office_agent after insert or update of phone, email, status on public.profiles
  for each row execute function public.link_profile_to_office_agent();

-- A row the admin adds links only to an approved account.
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
     where p.status = 'active'
       and (public.phone_key(p.phone) = public.phone_key(new.phone)
            or lower(p.email) = lower(nullif(trim(new.email), '')))
       and not exists (select 1 from public.office_agents o where o.profile_id = p.id and o.id <> new.id)
     limit 1;
  end if;
  return new;
end;
$$;

-- ---- 3. Commission % hidden from other agents -------------------------------
revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, phone, email, role, join_date, created_at, updated_at, status)
  on public.profiles to authenticated;

create or replace function public.agent_commission_rates()
returns table (id uuid, commission_split numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.commission_split
    from public.profiles p
   where public.is_active()
     and (public.is_admin() or p.id = (select auth.uid()));
$$;

revoke execute on function public.agent_commission_rates() from public, anon;
grant execute on function public.agent_commission_rates() to authenticated;

-- ---- 4. Calendar feed: buyer details only while the buyer is yours ----------
create or replace function public.calendar_feed(p_token text)
returns table (
  id uuid,
  title text,
  description text,
  due_at timestamptz,
  updated_at timestamptz,
  related text
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
           case when c.id is not null then 'מועמד: ' || c.full_name || coalesce(' (' || c.phone || ')', '') end)
    from public.calendar_feeds f
    join public.profiles p on p.id = f.user_id and p.status = 'active'
    join public.tasks t on t.assigned_to = f.user_id
    left join public.buyers b on b.id = t.buyer_id and (b.owner_agent_id = f.user_id or p.role = 'admin')
    left join public.properties pr on pr.id = t.property_id
    left join public.candidates c on c.id = t.candidate_id and p.role = 'admin'
   where length(p_token) >= 32
     and f.token = p_token
     and t.due_at is not null
     and not t.is_done
     and t.due_at > now() - interval '60 days'
   order by t.due_at;
$$;
