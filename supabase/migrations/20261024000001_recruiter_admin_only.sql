-- Only the admin decides who recruited a seller. The recruiting agent still manages
-- exclusivity; agents' own new sellers are recorded under them automatically.
-- The automatic hand-over at sign-up runs as the new agent, so it marks itself as allowed.

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
       or new.exclusivity_start is distinct from old.exclusivity_start
       or new.exclusivity_end is distinct from old.exclusivity_end then
      raise exception 'רק הסוכן המגייס או מנהל יכולים לשנות בלעדיות'
        using errcode = '42501';
    end if;
  end if;

  if new.current_price is distinct from old.current_price then
    new.previous_price := old.current_price;
  end if;
  return new;
end;
$$;

create or replace function public.hand_over_recruited()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is not null and new.profile_id is distinct from old.profile_id then
    perform set_config('app.recruiter_handover', 'on', true);
    update public.properties set recruiting_agent_id = new.profile_id
     where recruiter_id = new.id and recruiting_agent_id is distinct from new.profile_id;
    update public.buyers set owner_agent_id = new.profile_id
     where recruiter_id = new.id and owner_agent_id is distinct from new.profile_id;
    perform set_config('app.recruiter_handover', '', true);
  end if;
  return new;
end;
$$;
