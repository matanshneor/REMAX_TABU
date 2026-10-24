-- =============================================================================
-- "סוכן מגייס" on sellers and buyers, chosen from the office team list
-- =============================================================================
-- recruiter_id points at office_agents, so agents who haven't signed up yet can be
-- picked too. Permissions keep using the account columns (properties.recruiting_agent_id,
-- buyers.owner_agent_id); the two are kept in sync:
--   * choosing a recruiter sets the account to theirs (none yet → only the admin sees
--     the buyer / manages the seller),
--   * setting the account (older screens, "my own" defaults) picks their team row,
--   * when the agent signs up and their team row links to the account, everything
--     they recruited moves to them (buyers then notify them as "קיבלת קונה חדש").
-- =============================================================================

alter table public.properties add column recruiter_id uuid references public.office_agents (id) on delete set null;
alter table public.buyers add column recruiter_id uuid references public.office_agents (id) on delete set null;
create index properties_recruiter_idx on public.properties (recruiter_id);
create index buyers_recruiter_idx on public.buyers (recruiter_id);

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

revoke execute on function public.sync_recruiter() from public, anon, authenticated;

-- Named to run before the other BEFORE triggers (alphabetical), so the guards see the final values.
create trigger a_properties_sync_recruiter before insert or update of recruiter_id, recruiting_agent_id on public.properties
  for each row execute function public.sync_recruiter();
create trigger a_buyers_sync_recruiter before insert or update of recruiter_id, owner_agent_id on public.buyers
  for each row execute function public.sync_recruiter();

-- An agent signs up and their team row links: hand them what they recruited.
create or replace function public.hand_over_recruited()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is not null and new.profile_id is distinct from old.profile_id then
    update public.properties set recruiting_agent_id = new.profile_id
     where recruiter_id = new.id and recruiting_agent_id is distinct from new.profile_id;
    update public.buyers set owner_agent_id = new.profile_id
     where recruiter_id = new.id and owner_agent_id is distinct from new.profile_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.hand_over_recruited() from public, anon, authenticated;

create trigger office_agents_hand_over after update of profile_id on public.office_agents
  for each row execute function public.hand_over_recruited();

-- Existing rows: show the team row of whoever holds them today.
update public.properties p set recruiter_id = o.id
  from public.office_agents o where o.profile_id = p.recruiting_agent_id and p.recruiter_id is null;
update public.buyers b set recruiter_id = o.id
  from public.office_agents o where o.profile_id = b.owner_agent_id and b.recruiter_id is null;
