-- =============================================================================
-- Gender for every agent
-- =============================================================================
-- Chosen by the agent at sign-up (required) and kept on the office team list, where the admin
-- can fix it. The title printed on ads (סוכן / סוכנת נדל"ן) follows from it, so there is no
-- separate role to type in. Until an agent has a gender, the title already stored is used.
-- =============================================================================

alter table public.profiles      add column gender text check (gender in ('male', 'female'));
alter table public.office_agents add column gender text check (gender in ('male', 'female'));

-- Sign-up carries the gender in the account's metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name   text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                            split_part(coalesce(new.email, ''), '@', 1));
  v_gender text := case when new.raw_user_meta_data ->> 'gender' in ('male', 'female')
                        then new.raw_user_meta_data ->> 'gender' end;
begin
  insert into public.profiles (id, email, full_name, phone, gender)
  values (new.id, coalesce(new.email, ''), v_name, nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), v_gender);

  insert into public.notifications (recipient_id, kind, title, body, link)
  select p.id, 'signup_request', 'סוכן חדש ממתין לאישור',
         concat_ws(' · ', v_name, nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), new.email),
         '/agents'
    from public.profiles p
   where p.role = 'admin' and p.status = 'active';
  return new;
end;
$$;

-- When an account links to its row in the list, the gender it signed up with fills the row's gender (if empty).
create or replace function public.link_profile_to_office_agent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.office_agents o where o.profile_id = new.id) then
    update public.office_agents o
       set profile_id = new.id,
           gender = coalesce(o.gender, new.gender)
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

-- Same when the row is added (or fixed) after the account exists.
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
     where (public.phone_key(p.phone) = public.phone_key(new.phone)
            or lower(p.email) = lower(nullif(trim(new.email), '')))
       and not exists (select 1 from public.office_agents o where o.profile_id = p.id and o.id <> new.id)
     limit 1;
  end if;
  if new.gender is null and new.profile_id is not null then
    select p.gender into new.gender from public.profiles p where p.id = new.profile_id;
  end if;
  return new;
end;
$$;

-- The ad tool prints the title that follows from the gender.
create or replace function public.ad_tool_agents()
returns table (name text, role text, license text, phone text, photo_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.full_name,
         case o.gender when 'female' then 'סוכנת נדל"ן' when 'male' then 'סוכן נדל"ן' else o.role end,
         o.license, o.phone, o.photo_url
    from public.office_agents o
    left join public.profiles p on p.id = o.profile_id
   order by (p.role = 'admin') desc nulls last, o.full_name;
$$;
