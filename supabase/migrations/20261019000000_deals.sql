-- Closed deals. Each deal records the commission that came into the office and the agent's
-- percentage; the agent's share and the office's share are computed. Saving a deal keeps two
-- linked accounting rows in sync: an income (the whole commission) and an expense (the
-- agent's share). Only the admin records deals; each agent sees only their own.

create table public.deals (
  id                 uuid primary key default gen_random_uuid(),
  closed_on          date not null default current_date,
  agent_id           uuid not null references public.profiles (id),
  property_id        uuid references public.properties (id) on delete set null,
  buyer_id           uuid references public.buyers (id) on delete set null,
  deal_price         numeric(12, 0) check (deal_price >= 0),          -- the property's sale price (optional)
  commission_amount  numeric(12, 2) not null check (commission_amount > 0),  -- money in to the office
  agent_percent      numeric(5, 2) not null check (agent_percent > 0 and agent_percent <= 100),
  agent_amount       numeric(12, 2) generated always as (round(commission_amount * agent_percent / 100, 2)) stored,
  office_amount      numeric(12, 2) generated always as (commission_amount - round(commission_amount * agent_percent / 100, 2)) stored,
  notes              text,
  created_by         uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger deals_updated_at before update on public.deals
  for each row execute function public.set_updated_at();

create index deals_agent_closed_idx on public.deals (agent_id, closed_on desc);
create index deals_closed_idx on public.deals (closed_on desc);

-- Accounting rows created from a deal point back to it and disappear with it.
alter table public.financial_transactions
  add column deal_id uuid references public.deals (id) on delete cascade;
create index financial_transactions_deal_idx on public.financial_transactions (deal_id);

-- Keep the deal's income + agent-payout rows in sync. SECURITY DEFINER so the rows are written
-- regardless of who triggers it (only the admin can write deals anyway, per RLS below).
create or replace function public.sync_deal_transactions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  label text := concat_ws(' · ', 'עסקה', new.notes);
begin
  if tg_op = 'INSERT' then
    insert into public.financial_transactions
      (occurred_on, type, amount, category, agent_id, property_id, buyer_id, notes, deal_id, created_by)
    values
      (new.closed_on, 'income', new.commission_amount, 'עמלה', new.agent_id, new.property_id, new.buyer_id, label, new.id, new.created_by),
      (new.closed_on, 'expense', new.agent_amount, 'תשלום לסוכן', new.agent_id, new.property_id, new.buyer_id, label, new.id, new.created_by);
  else
    update public.financial_transactions
       set occurred_on = new.closed_on,
           amount = case when type = 'income' then new.commission_amount else new.agent_amount end,
           agent_id = new.agent_id,
           property_id = new.property_id,
           buyer_id = new.buyer_id,
           notes = label
     where deal_id = new.id;
  end if;
  return null;
end;
$$;

create trigger deals_sync_transactions
  after insert or update on public.deals
  for each row execute function public.sync_deal_transactions();

revoke execute on function public.sync_deal_transactions() from public, anon, authenticated;

alter table public.deals enable row level security;

create policy "deals: own or admin read" on public.deals
  for select to authenticated using (agent_id = (select auth.uid()) or (select public.is_admin()));
create policy "deals: admin insert" on public.deals
  for insert to authenticated with check ((select public.is_admin()));
create policy "deals: admin update" on public.deals
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "deals: admin delete" on public.deals
  for delete to authenticated using ((select public.is_admin()));
