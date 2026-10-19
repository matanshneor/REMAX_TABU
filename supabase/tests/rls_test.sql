-- =============================================================================
-- RLS tests. Impersonates an admin and two agents and checks every lock.
-- Runs inside a transaction that is rolled back, so it leaves no data behind.
--   psql "$DATABASE_URL" -f supabase/tests/rls_test.sql
-- (or paste into the Supabase SQL editor). Any failed check aborts with an error.
-- =============================================================================
begin;

-- ---- Seed (as postgres, RLS bypassed) ---------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.local',   '{"full_name": "מנהל"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'agent.a@test.local', '{"full_name": "סוכן א"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'agent.b@test.local', '{"full_name": "סוכן ב"}');
update public.profiles set status = 'active';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
-- A self sign-up that tries to make itself admin through the form metadata.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'pending@test.local',
   '{"full_name": "ממתין", "phone": "050-9999999", "role": "admin", "status": "active"}');

insert into public.properties (id, city, street, recruiting_agent_id, is_exclusive, current_price) values
  ('10000000-0000-0000-0000-000000000001', 'תל אביב', 'דיזנגוף', '00000000-0000-0000-0000-0000000000a1', true,  3000000),
  ('10000000-0000-0000-0000-000000000002', 'רמת גן',  'ביאליק',  '00000000-0000-0000-0000-0000000000a1', false, 2000000);
insert into public.property_owner_details (property_id, owner_name, owner_phone) values
  ('10000000-0000-0000-0000-000000000001', 'בעל נכס 1', '050-0000001'),
  ('10000000-0000-0000-0000-000000000002', 'בעל נכס 2', '050-0000002');
insert into public.buyers (id, full_name, owner_agent_id) values
  ('20000000-0000-0000-0000-000000000001', 'קונה תפוס', '00000000-0000-0000-0000-0000000000a1'),
  ('20000000-0000-0000-0000-000000000002', 'קונה פנוי', null),
  ('20000000-0000-0000-0000-000000000003', 'קונה פנוי שני', null);
update public.buyers set phone = '050-123-4567' where id = '20000000-0000-0000-0000-000000000003';
insert into public.buyer_property_viewings (buyer_id, property_id, agent_id) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1');
insert into public.financial_transactions (type, amount, category) values ('income', 15000, 'commission');
insert into public.candidates (full_name) values ('מועמד לבדיקה');
insert into public.deals (id, agent_id, commission_amount, agent_percent, notes)
  values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 40000, 50, 'עסקת בדיקה');

set local role authenticated;

-- ---- Agent B ----------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}', true);

do $$
declare n integer;
begin
  -- Reads
  assert (select count(*) from public.properties) = 2, 'agent should see all properties';
  assert (select count(*) from public.buyers) = 0, 'agent B must not see other agents'' or unassigned buyers';
  assert (select count(*) from public.buyer_property_viewings) = 0, 'agent B must not see viewings of other agents'' buyers';
  assert (select count(*) from public.property_owner_details) = 2, 'every agent should see all sellers';
  assert (select count(*) from public.financial_transactions) = 0, 'agent must not see financial transactions';
  assert (select count(*) from public.candidates) = 0, 'agent must not see candidates';

  -- Exclusivity lock
  update public.properties set city = 'פריצה' where id = '10000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'agent B edited an exclusive property of agent A';

  update public.properties set current_price = 1900000 where id = '10000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 1, 'agent B should be able to edit a non-exclusive property';
  assert (select previous_price from public.properties where id = '10000000-0000-0000-0000-000000000002') = 2000000,
    'previous_price should be filled automatically';

  begin
    update public.properties set is_exclusive = true where id = '10000000-0000-0000-0000-000000000002';
    raise exception 'FAIL: agent B made agent A''s property exclusive';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.properties set recruiting_agent_id = '00000000-0000-0000-0000-0000000000b1'
      where id = '10000000-0000-0000-0000-000000000002';
    raise exception 'FAIL: agent B took over agent A''s property';
  exception when insufficient_privilege then null;
  end;

  -- Seller details follow the property's edit rule
  update public.property_owner_details set notes = 'עודכן ע״י ב' where property_id = '10000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 1, 'agent B should edit the seller of a non-exclusive property';
  update public.property_owner_details set notes = 'פריצה' where property_id = '10000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'agent B edited the seller of an exclusive property';
  assert (select count(*) from public.global_search('בעל נכס 2')) = 1, 'search should find a property by seller name';

  -- No deletes for agents
  delete from public.properties where id = '10000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'agent deleted a property';
  delete from public.buyers where id = '20000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'agent deleted a buyer';

  -- Buyers are private per agent
  update public.buyers set notes = 'פריצה' where id = '20000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'agent B edited a buyer of agent A';

  update public.buyers set owner_agent_id = '00000000-0000-0000-0000-0000000000b1'
    where id = '20000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'agent B claimed an unassigned buyer (only the admin assigns)';

  insert into public.buyers (id, full_name, owner_agent_id)
    values ('20000000-0000-0000-0000-0000000000b1', 'קונה של סוכן ב', '00000000-0000-0000-0000-0000000000b1');
  assert (select count(*) from public.buyers) = 1, 'agent B should see own new buyer';

  begin
    insert into public.buyers (full_name, owner_agent_id) values ('קונה ללא בעלים', null);
    raise exception 'FAIL: agent created an unassigned buyer';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.buyers (full_name, owner_agent_id) values ('קונה לסוכן אחר', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'FAIL: agent created a buyer for another agent';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.buyers set owner_agent_id = '00000000-0000-0000-0000-0000000000a1'
      where id = '20000000-0000-0000-0000-0000000000b1';
    raise exception 'FAIL: agent B handed own buyer to another agent';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.buyer_property_viewings (buyer_id, property_id, agent_id)
      values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1');
    raise exception 'FAIL: agent B logged a viewing for agent A''s buyer';
  exception when insufficient_privilege then null;
  end;

  -- Deals: an agent sees only their own and can't record deals
  assert (select count(*) from public.deals) = 0, 'agent B must not see agent A''s deals';
  begin
    insert into public.deals (agent_id, commission_amount, agent_percent) values ('00000000-0000-0000-0000-0000000000b1', 1000, 50);
    raise exception 'FAIL: agent recorded a deal';
  exception when insufficient_privilege then null;
  end;

  -- Admin-only tables
  begin
    insert into public.financial_transactions (type, amount, category) values ('expense', 1, 'x');
    raise exception 'FAIL: agent inserted a financial transaction';
  exception when insufficient_privilege then null;
  end;

  -- Profiles
  update public.profiles set phone = '050-1234567' where id = '00000000-0000-0000-0000-0000000000b1';
  get diagnostics n = row_count;
  assert n = 1, 'agent should be able to edit own phone';

  begin
    update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b1';
    raise exception 'FAIL: agent promoted themself to admin';
  exception when insufficient_privilege then null;
  end;

  update public.profiles set full_name = 'פריצה' where id = '00000000-0000-0000-0000-0000000000a1';
  get diagnostics n = row_count;
  assert n = 0, 'agent edited another agent''s profile';

  -- Notifications are created by the backend only
  begin
    insert into public.notifications (recipient_id, kind, title)
      values ('00000000-0000-0000-0000-0000000000a1', 'spam', 'x');
    raise exception 'FAIL: agent inserted a notification';
  exception when insufficient_privilege then null;
  end;

  -- Tasks are private
  insert into public.tasks (title) values ('משימה של סוכן ב');
  insert into public.tasks (title) values ('משימה למחיקה');
  delete from public.tasks where title = 'משימה למחיקה';
  get diagnostics n = row_count;
  assert n = 1, 'agent should be able to delete own task';

  begin
    insert into public.tasks (title, assigned_to) values ('משימה לסוכן אחר', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'FAIL: agent assigned a task to another agent';
  exception when insufficient_privilege then null;
  end;

  -- Global search respects RLS
  assert (select count(*) from public.global_search('קונה')) = 1, 'search should find only own buyers';
  assert (select count(*) from public.global_search('מועמד')) = 0, 'search must not leak candidates to agents';

  -- Duplicate phone detection ignores formatting and the country code
  -- …and works across agents, without revealing the other buyer's name or id
  assert (select count(*) from public.find_buyers_by_phone('+972 50 1234567')) = 1, 'duplicate phone not detected';
  assert (select full_name is null and id is null from public.find_buyers_by_phone('0501234567')),
    'duplicate check leaked another agent''s buyer details';
  assert (select count(*) from public.find_buyers_by_phone('0501234567', '20000000-0000-0000-0000-000000000003')) = 0,
    'excluded buyer should not be reported as its own duplicate';
  assert (select count(*) from public.find_buyers_by_phone('050')) = 0, 'partial numbers must not match';
end $$;

-- ---- Agent A ----------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);

do $$
declare n integer;
begin
  update public.properties set exclusivity_end = current_date + 90 where id = '10000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'recruiting agent should edit own exclusive property';

  assert (select count(*) from public.property_owner_details) = 2, 'recruiting agent should see own owner details';

  assert (select count(*) from public.buyers) = 1, 'agent A should see only own buyer';
  assert (select agent_amount from public.deals) = 20000, 'agent A should see own deal with computed share';
  assert (select count(*) from public.buyer_property_viewings) = 1, 'agent A should see viewings of own buyer';
  update public.buyers set notes = 'עדכון' where id = '20000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'owning agent should edit own buyer';

  assert (select count(*) from public.tasks) = 0, 'agent A must not see agent B''s tasks';
  update public.tasks set title = 'פריצה' where created_by = '00000000-0000-0000-0000-0000000000b1';
  get diagnostics n = row_count;
  assert n = 0, 'agent A edited a task of agent B';
end $$;

-- ---- Pending sign-up --------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000c1", "role": "authenticated"}', true);

do $$
declare n integer;
begin
  assert (select status = 'pending' and role = 'agent' and phone = '050-9999999' from public.profiles),
    'sign-up should start as a pending agent';
  assert (select count(*) from public.profiles) = 1, 'pending user should see only own profile';
  assert (select count(*) from public.properties) = 0, 'pending user must not see properties';
  assert (select count(*) from public.property_owner_details) = 0, 'pending user must not see sellers';
  assert (select count(*) from public.buyers) = 0, 'pending user must not see buyers';
  assert (select count(*) from public.buyer_property_viewings) = 0, 'pending user must not see viewings';
  assert (select count(*) from public.tasks) = 0, 'pending user must not see tasks';
  assert (select count(*) from public.notifications) = 0, 'pending user must not see notifications';
  assert (select count(*) from public.deals) = 0, 'pending user must not see deals';
  assert (select count(*) from public.global_search('תל')) = 0, 'pending user search must find nothing';
  assert (select count(*) from public.find_buyers_by_phone('0501234567')) = 0, 'pending user duplicate check must find nothing';

  begin
    insert into public.tasks (title) values ('משימה של ממתין');
    raise exception 'FAIL: pending user created a task';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.properties (city, recruiting_agent_id) values ('פריצה', '00000000-0000-0000-0000-0000000000c1');
    raise exception 'FAIL: pending user created a property';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000c1';
    raise exception 'FAIL: pending user approved themself';
  exception when insufficient_privilege then null;
  end;

  update public.profiles set full_name = 'ממתין מעודכן' where id = '00000000-0000-0000-0000-0000000000c1';
  get diagnostics n = row_count;
  assert n = 1, 'pending user should edit own name';
end $$;

-- ---- Admin ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

do $$
declare n integer;
begin
  assert (select count(*) from public.financial_transactions) = 3, 'admin should see transactions (1 manual + 2 from the deal)';
  assert (select amount from public.financial_transactions where deal_id is not null and type = 'income') = 40000, 'deal income row';
  assert (select amount from public.financial_transactions where deal_id is not null and type = 'expense') = 20000, 'deal agent-payout row';

  update public.deals set commission_amount = 60000, agent_percent = 40 where id = '30000000-0000-0000-0000-000000000001';
  assert (select office_amount from public.deals) = 36000, 'office share recomputed';
  assert (select amount from public.financial_transactions where deal_id is not null and type = 'expense') = 24000, 'payout row follows the deal';

  delete from public.deals where id = '30000000-0000-0000-0000-000000000001';
  assert (select count(*) from public.financial_transactions where deal_id is not null) = 0, 'deal rows removed with the deal';
  assert (select count(*) from public.candidates) = 1, 'admin should see candidates';
  assert (select count(*) from public.global_search('מועמד')) = 1, 'admin search should find candidates';
  assert (select count(*) from public.tasks) = 0, 'tasks are private — even the admin must not see agents'' tasks';
  assert (select count(*) from public.buyers) = 4, 'admin should see all buyers, including unassigned';
  assert (select count(*) from public.buyer_property_viewings) = 1, 'admin should see all viewings';
  assert (select full_name from public.find_buyers_by_phone('0501234567')) = 'קונה פנוי שני', 'admin sees duplicate details';

  update public.buyers set owner_agent_id = '00000000-0000-0000-0000-0000000000a1'
    where id = '20000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 1, 'admin should assign a buyer to an agent';

  update public.properties set city = 'חיפה' where id = '10000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'admin should edit any exclusive property';

  update public.profiles set commission_split = 60 where id = '00000000-0000-0000-0000-0000000000b1';
  get diagnostics n = row_count;
  assert n = 1, 'admin should change commission split';

  delete from public.properties where id = '10000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 1, 'admin should delete properties';

  -- Sign-up approval
  assert (select count(*) from public.notifications where kind = 'signup_request') = 1, 'admin should be notified of the sign-up';
  update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000c1';
  get diagnostics n = row_count;
  assert n = 1, 'admin should approve a sign-up';

  raise notice 'ALL RLS TESTS PASSED';
end $$;

rollback;
