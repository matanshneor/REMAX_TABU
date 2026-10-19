-- When someone who isn't an admin marks a buyer "bought with us", tell the admins in the bell
-- so the deal (and the commission) gets recorded.
create or replace function public.notify_bought_with_us()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_by text;
begin
  if new.status = 'bought_with_us' and old.status is distinct from 'bought_with_us' and not public.is_admin() then
    select full_name into v_by from public.profiles where id = auth.uid();
    insert into public.notifications (recipient_id, kind, title, body, link)
    select p.id, 'bought_with_us', 'קונה קנה דרכנו — לרשום עסקה',
           concat(new.full_name, ' סומן "קנה דרכנו"', case when v_by is not null then ' ע״י ' || v_by end,
                  '. כדאי לרשום את העסקה ואת העמלה.'),
           '/buyers?open=' || new.id
      from public.profiles p
     where p.role = 'admin' and p.status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists buyers_notify_bought_with_us on public.buyers;
create trigger buyers_notify_bought_with_us
  after update of status on public.buyers
  for each row execute function public.notify_bought_with_us();
