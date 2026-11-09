-- =============================================================================
-- Removing an agent from the team list also deletes their account
-- =============================================================================
-- remove_office_agent(row id), admin only:
--   * their buyers and sellers go to the admin;
--   * their personal tasks are deleted;
--   * closed deals stay, marked as a former agent (agent_id becomes null, the name is kept);
--   * the account is deleted (they can't sign in any more), then the list row.
-- The office manager can't be removed this way.
-- =============================================================================

-- Deals outlive the agent: the name is kept on the deal itself.
alter table public.deals add column agent_name text;
update public.deals d set agent_name = p.full_name from public.profiles p where p.id = d.agent_id;

alter table public.deals alter column agent_id drop not null;

create or replace function public.keep_deal_agent_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.agent_id is not null then
    new.agent_name := (select p.full_name from public.profiles p where p.id = new.agent_id);
  end if;
  return new;
end;
$$;

revoke execute on function public.keep_deal_agent_name() from public, anon, authenticated;

create trigger deals_keep_agent_name before insert or update of agent_id on public.deals
  for each row execute function public.keep_deal_agent_name();

create or replace function public.remove_office_agent(p_row uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin   uuid := (select auth.uid());
  v_account uuid;
begin
  if not (select public.is_admin()) then
    raise exception 'רק מנהל המשרד יכול להסיר סוכן' using errcode = '42501';
  end if;

  select o.profile_id into v_account from public.office_agents o where o.id = p_row;
  if not found then
    raise exception 'הסוכן לא נמצא ברשימה';
  end if;

  if v_account is not null then
    if v_account = v_admin or exists (select 1 from public.profiles p where p.id = v_account and p.role = 'admin') then
      raise exception 'אי אפשר להסיר את מנהל המשרד';
    end if;

    update public.buyers set owner_agent_id = v_admin where owner_agent_id = v_account;
    update public.properties set recruiting_agent_id = v_admin where recruiting_agent_id = v_account;
    -- Closed deals stay: the name is already on the deal, the account link is cut.
    update public.deals set agent_id = null where agent_id = v_account;
    delete from public.tasks where assigned_to = v_account;
  end if;

  delete from public.office_agents where id = p_row;
  if v_account is not null then
    delete from auth.users where id = v_account;  -- the profile goes with it
  end if;
end;
$$;

revoke execute on function public.remove_office_agent(uuid) from public, anon;
grant execute on function public.remove_office_agent(uuid) to authenticated;
