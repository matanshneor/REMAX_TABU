-- =============================================================================
-- Self sign-up with manager approval
-- =============================================================================
--   * Every new account starts as 'pending' and sees nothing until an admin
--     approves it ('active'). 'rejected' accounts stay locked out.
--   * Restrictive policies on every table AND-combine with the existing ones,
--     so no existing permission can leak data to an unapproved account.
--   * Only admins (or the system) can change status; the sign-up form cannot
--     choose a role or a status (handle_new_user ignores anything but name/phone).
--   * Admins get a bell notification for each new sign-up.
-- =============================================================================

create type public.account_status as enum ('pending', 'active', 'rejected');

-- Existing accounts were created by the office, so they are approved.
alter table public.profiles
  add column status public.account_status not null default 'active';
alter table public.profiles alter column status set default 'pending';

create or replace function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active'
  );
$$;

revoke execute on function public.is_active() from public, anon;

-- An admin whose account is not active is not an admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'active'
  );
$$;

-- New profile: name and phone from the sign-up form; role and status always defaults.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
                          split_part(coalesce(new.email, ''), '@', 1));
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, coalesce(new.email, ''), v_name, nullif(trim(new.raw_user_meta_data ->> 'phone'), ''));

  insert into public.notifications (recipient_id, kind, title, body, link)
  select p.id, 'signup_request', 'סוכן חדש ממתין לאישור',
         concat_ws(' · ', v_name, nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), new.email),
         '/agents'
    from public.profiles p
   where p.role = 'admin' and p.status = 'active';
  return new;
end;
$$;

-- Status joins the fields only an admin may change.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_system() or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.commission_split is distinct from old.commission_split
     or new.join_date is distinct from old.join_date
     or new.email is distinct from old.email then
    raise exception 'רק מנהל יכול לשנות תפקיד, סטטוס, אחוז עמלה, תאריך הצטרפות או אימייל'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Lock out unapproved accounts
-- -----------------------------------------------------------------------------
-- A pending user may still read and edit their own profile (to see the waiting screen).
create policy "approved only" on public.profiles
  as restrictive for all to authenticated
  using ((select public.is_active()) or id = (select auth.uid()))
  with check ((select public.is_active()) or id = (select auth.uid()));

create policy "approved only" on public.properties
  as restrictive for all to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));
create policy "approved only" on public.property_owner_details
  as restrictive for all to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));
create policy "approved only" on public.buyers
  as restrictive for all to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));
create policy "approved only" on public.buyer_property_viewings
  as restrictive for all to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));
create policy "approved only" on public.tasks
  as restrictive for all to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));
create policy "approved only" on public.notifications
  as restrictive for all to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));
create policy "approved only" on public.financial_transactions
  as restrictive for all to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));
create policy "approved only" on public.candidates
  as restrictive for all to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));
create policy "approved only" on public.deals
  as restrictive for all to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));
create policy "approved only" on storage.objects
  as restrictive for all to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));

-- SECURITY DEFINER bypasses RLS, so the duplicate-phone check gets its own gate.
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
  where public.is_active()
    and length(public.phone_key(p_phone)) = 9
    and public.phone_key(b.phone) = public.phone_key(p_phone)
    and (p_exclude is null or b.id <> p_exclude)
  order by b.updated_at desc
  limit 5;
$$;
