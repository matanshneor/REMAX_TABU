-- Notifications that no longer mean anything remove themselves:
--  * "new agent waiting for approval" once the account is approved, rejected or deleted;
--  * "task overdue" once the task is done, moved to a later date, or deleted;
--  * any notification pointing at a buyer, seller, listing or task that was deleted.

create or replace function public.cleanup_signup_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := coalesce(old.email, '');
begin
  if v_email <> '' and (tg_op = 'DELETE' or new.status <> 'pending') then
    delete from public.notifications n
     where n.kind = 'signup_request' and n.body like '%' || v_email;
  end if;
  return null;
end;
$$;

create trigger profiles_cleanup_signup_notifications
after update of status or delete on public.profiles
for each row execute function public.cleanup_signup_notifications();

create or replace function public.cleanup_task_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.notifications n where n.link = '/tasks?open=' || old.id;
  elsif new.is_done or new.due_at is null or new.due_at > now() then
    delete from public.notifications n where n.kind = 'task_overdue' and n.link = '/tasks?open=' || new.id;
  end if;
  return null;
end;
$$;

create trigger tasks_cleanup_notifications
after update of is_done, due_at or delete on public.tasks
for each row execute function public.cleanup_task_notifications();

-- One function for the deleted-record case; the page path comes from the trigger argument.
create or replace function public.cleanup_record_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications n where n.link = tg_argv[0] || '?open=' || old.id;
  return null;
end;
$$;

create trigger buyers_cleanup_notifications
after delete on public.buyers
for each row execute function public.cleanup_record_notifications('/buyers');

create trigger properties_cleanup_notifications
after delete on public.properties
for each row execute function public.cleanup_record_notifications('/properties');

create trigger market_listings_cleanup_notifications
after delete on public.market_listings
for each row execute function public.cleanup_record_notifications('/market');

-- What is already stale today.
delete from public.notifications n
 where n.kind = 'signup_request'
   and not exists (
     select 1 from public.profiles p
      where p.status = 'pending' and p.email <> '' and n.body like '%' || p.email
   );

delete from public.notifications n
 where n.kind = 'task_overdue'
   and not exists (
     select 1 from public.tasks t
      where n.link = '/tasks?open=' || t.id and not t.is_done and t.due_at <= now()
   );
