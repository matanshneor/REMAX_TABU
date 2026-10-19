-- When the admin hands a buyer to an agent (new lead or reassignment), tell that agent in the bell.
-- The buyer's call log and viewings move with it, since they follow the buyer's visibility.
create or replace function public.notify_buyer_assigned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_agent_id is not null
     and new.owner_agent_id is distinct from old.owner_agent_id
     and new.owner_agent_id is distinct from (select auth.uid()) then
    insert into public.notifications (recipient_id, kind, title, body, link)
    values (
      new.owner_agent_id,
      'buyer_assigned',
      'קיבלת קונה חדש: ' || new.full_name,
      concat_ws(' · ', new.phone, 'הועבר אליך ע״י מנהל המשרד'),
      '/buyers?open=' || new.id
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.notify_buyer_assigned() from public, anon, authenticated;

create trigger buyers_notify_assigned
  after update of owner_agent_id on public.buyers
  for each row execute function public.notify_buyer_assigned();
