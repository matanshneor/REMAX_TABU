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

  -- Only the admin can tie a task to a recruiting candidate
  begin
    insert into public.tasks (title, candidate_id) values ('ריאיון', gen_random_uuid());
    raise exception 'FAIL: agent linked a task to a candidate';
  exception when insufficient_privilege then null;
  end;

  -- Office team list: everyone reads it, only the admin edits it
  begin
    insert into public.office_agents (full_name) values ('סוכן מזויף');
    raise exception 'FAIL: agent added someone to the office team list';
  exception when insufficient_privilege then null;
  end;

  -- Calendar feed: a personal link with only your own open, dated tasks
  declare v_token text;
  begin
    v_token := public.rotate_calendar_token();
    insert into public.tasks (title, due_at) values ('משימה ביומן של ב', now() + interval '2 days');
    assert (select count(*) from public.calendar_feed(v_token)) = 1, 'the feed should list my dated open task';
    assert (select count(*) from public.calendar_feed(v_token || 'x')) = 0, 'a wrong link must return nothing';
    assert (select count(*) from public.calendar_feed('')) = 0, 'an empty link must return nothing';
  end;

  -- Call log follows buyer visibility
  begin
    insert into public.buyer_notes (buyer_id, body) values ('20000000-0000-0000-0000-000000000001', 'פריצה');
    raise exception 'FAIL: agent B logged a call on agent A''s buyer';
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

  begin
    update public.properties set recruiting_agent_id = '00000000-0000-0000-0000-0000000000b1'
      where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'FAIL: the recruiting agent changed who recruited the seller (admin only)';
  exception when insufficient_privilege then null;
  end;

  assert (select count(*) from public.calendar_feeds) = 0, 'agent A must not see agent B''s calendar link';
  assert (select count(*) from public.buyers) = 1, 'agent A should see only own buyer';
  assert (select agent_amount from public.deals) = 20000, 'agent A should see own deal with computed share';
  assert (select count(*) from public.buyer_property_viewings) = 1, 'agent A should see viewings of own buyer';
  update public.buyers set notes = 'עדכון' where id = '20000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'owning agent should edit own buyer';

  insert into public.buyer_notes (buyer_id, body) values ('20000000-0000-0000-0000-000000000001', 'דיברנו, מחכה למשכנתא');
  assert (select count(*) from public.buyer_notes) = 1, 'agent A should log and see calls on own buyer';
  begin
    insert into public.buyer_notes (buyer_id, author_id, body)
      values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'בשם מישהו אחר');
    raise exception 'FAIL: agent A wrote a call log entry as someone else';
  exception when insufficient_privilege then null;
  end;

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
  assert (select status = 'pending' and role = 'agent' and phone = '050-999-9999' from public.profiles),
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
  insert into public.tasks (title, candidate_id, due_at)
    select 'ריאיון עם מועמד', id, now() + interval '1 day' from public.candidates limit 1;
  assert (select count(*) from public.tasks where candidate_id is not null) = 1, 'admin should schedule an interview task for a candidate';
  assert (select count(*) from public.global_search('מועמד')) = 1, 'admin search should find candidates';
  assert (select count(*) from public.tasks where assigned_to <> '00000000-0000-0000-0000-00000000000a') = 0, 'tasks are private — even the admin must not see agents'' tasks';
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

  assert (select count(*) from public.buyer_notes) = 1, 'admin should see every call log entry';
end $$;

-- ---- Match notifications (as postgres, to read everyone's bell) ------------
reset role;

do $$
begin
  -- No requirements on the test buyers, so a new active seller fits every open buyer.
  insert into public.properties (id, city, neighborhood, street, current_price, recruiting_agent_id)
    values ('10000000-0000-0000-0000-000000000009', 'ירושלים', 'פסגת זאב מרכז', 'הבדיקה', 1000000, '00000000-0000-0000-0000-0000000000a1');
  assert (select count(*) from public.notifications where kind = 'property_match' and recipient_id = '00000000-0000-0000-0000-0000000000a1') = 1,
    'agent A should get one notification for a new matching seller';
  assert (select title like '%2 מהקונים שלך%' from public.notifications where kind = 'property_match' and recipient_id = '00000000-0000-0000-0000-0000000000a1'),
    'agent A has two matching buyers';
  assert (select count(*) from public.notifications where kind = 'property_match' and recipient_id = '00000000-0000-0000-0000-0000000000b1') = 1,
    'agent B should be notified about own matching buyer';
  assert (select count(*) from public.notifications where kind = 'property_match' and recipient_id = '00000000-0000-0000-0000-00000000000a') = 1,
    'admin should be notified about the unassigned matching buyer';

  -- Still matching after a price change: nothing new.
  update public.properties set current_price = 1100000 where id = '10000000-0000-0000-0000-000000000009';
  assert (select count(*) from public.notifications where kind = 'property_match') = 3, 'no repeat while it already matched';

  -- Off the market and back: it starts matching again.
  update public.properties set status = 'frozen' where id = '10000000-0000-0000-0000-000000000009';
  update public.properties set status = 'active' where id = '10000000-0000-0000-0000-000000000009';
  assert (select count(*) from public.notifications where kind = 'property_match') = 6, 'back on the market notifies again';

  -- A "must have" the seller lacks: no match.
  update public.buyers set needs_safe_room = 'must' where id = '20000000-0000-0000-0000-000000000003';
  insert into public.properties (city, current_price) values ('ירושלים', 900000);
  assert (select count(*) from public.notifications where kind = 'property_match' and recipient_id = '00000000-0000-0000-0000-00000000000a') = 2,
    'unassigned buyer needing a safe room must not match a seller without one';

  -- The admin assigned buyer 2 to agent A earlier: A was told in the bell.
  assert (select count(*) from public.notifications where kind = 'buyer_assigned' and recipient_id = '00000000-0000-0000-0000-0000000000a1') = 1,
    'agent should be notified when the admin hands them a buyer';

  -- Phones are saved in one format, and search ignores dashes.
  insert into public.buyers (id, full_name, phone)
    values ('20000000-0000-0000-0000-0000000000f1', 'בדיקת טלפון', '+972 52 765 4321');
  assert (select phone from public.buyers where id = '20000000-0000-0000-0000-0000000000f1') = '052-765-4321', 'mobile should be formatted';
  update public.buyers set phone = '026541234' where id = '20000000-0000-0000-0000-0000000000f1';
  assert (select phone from public.buyers where id = '20000000-0000-0000-0000-0000000000f1') = '02-654-1234', 'landline should be formatted';
  update public.buyers set phone = 'אחרי 18:00' where id = '20000000-0000-0000-0000-0000000000f1';
  assert (select phone from public.buyers where id = '20000000-0000-0000-0000-0000000000f1') = 'אחרי 18:00', 'unrecognized text is kept as typed';
  update public.buyers set phone = '0527654321' where id = '20000000-0000-0000-0000-0000000000f1';
  assert (select count(*) from public.global_search('0527654321') where id = '20000000-0000-0000-0000-0000000000f1') = 1,
    'search without dashes should find a formatted phone';

  -- Office team list links accounts by phone or email, in either order.
  insert into public.office_agents (id, full_name, phone)
    values ('40000000-0000-0000-0000-000000000001', 'סוכן ב ברשימה', '0501234567');
  assert (select profile_id from public.office_agents where id = '40000000-0000-0000-0000-000000000001')
    = '00000000-0000-0000-0000-0000000000b1', 'a listed agent who already signed up should be linked by phone';
  insert into public.office_agents (id, full_name, phone)
    values ('40000000-0000-0000-0000-000000000002', 'סוכן עתידי', '052-000-1111');
  assert (select profile_id is null from public.office_agents where id = '40000000-0000-0000-0000-000000000002'),
    'an agent who has not signed up yet stays unlinked';
  insert into auth.users (id, email, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000000d1', 'future@test.local', '{"full_name": "סוכן עתידי", "phone": "+972520001111"}');
  assert (select profile_id is null from public.office_agents where id = '40000000-0000-0000-0000-000000000002'),
    'a pending sign-up must not link to the team list yet';
  update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000d1';
  assert (select profile_id from public.office_agents where id = '40000000-0000-0000-0000-000000000002')
    = '00000000-0000-0000-0000-0000000000d1', 'approval should link the agent to their row in the list';

  -- Recruiter from the team list: before sign-up only the admin holds the work, after it moves over.
  insert into public.office_agents (id, full_name, phone)
    values ('40000000-0000-0000-0000-000000000003', 'מגייס שעוד לא נרשם', '052-999-1212');
  insert into public.buyers (id, full_name, recruiter_id)
    values ('20000000-0000-0000-0000-0000000000e1', 'קונה של מגייס', '40000000-0000-0000-0000-000000000003');
  insert into public.properties (id, city, recruiter_id, recruiting_agent_id)
    values ('10000000-0000-0000-0000-0000000000e1', 'ירושלים', '40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a');
  assert (select owner_agent_id is null from public.buyers where id = '20000000-0000-0000-0000-0000000000e1'),
    'a buyer of an agent who has not signed up stays with the admin only';
  assert (select recruiting_agent_id is null from public.properties where id = '10000000-0000-0000-0000-0000000000e1'),
    'the chosen recruiter decides the seller''s account, not the default';
  insert into auth.users (id, email, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000000e1', 'recruiter@test.local', '{"full_name": "מגייס", "phone": "0529991212"}');
  assert (select owner_agent_id is null from public.buyers where id = '20000000-0000-0000-0000-0000000000e1'),
    'a pending sign-up must not receive recruited buyers';
  update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000e1';
  assert (select owner_agent_id from public.buyers where id = '20000000-0000-0000-0000-0000000000e1')
    = '00000000-0000-0000-0000-0000000000e1', 'approval should hand the agent their buyers';
  assert (select recruiting_agent_id from public.properties where id = '10000000-0000-0000-0000-0000000000e1')
    = '00000000-0000-0000-0000-0000000000e1', 'approval should hand the agent their sellers';
  assert (select count(*) from public.notifications where kind = 'buyer_assigned' and recipient_id = '00000000-0000-0000-0000-0000000000e1') = 1,
    'the agent should be told about the buyers that moved to them';
  insert into public.buyers (id, full_name, owner_agent_id)
    values ('20000000-0000-0000-0000-0000000000e2', 'קונה של סוכן ב', '00000000-0000-0000-0000-0000000000b1');
  assert (select recruiter_id from public.buyers where id = '20000000-0000-0000-0000-0000000000e2')
    = '40000000-0000-0000-0000-000000000001', 'setting the account should show the agent''s team row as recruiter';

  raise notice 'ALL RLS TESTS PASSED';
end $$;

-- ---- Hand-over when a signed-up agent fixes their own phone -----------------
do $$
begin
  insert into public.office_agents (id, full_name, phone)
    values ('40000000-0000-0000-0000-000000000004', 'סוכן עם טלפון אחר', '052-777-1111');
  insert into public.properties (id, city, recruiter_id)
    values ('10000000-0000-0000-0000-0000000000f4', 'ירושלים', '40000000-0000-0000-0000-000000000004');
  insert into auth.users (id, email, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000000f4', 'otherphone@test.local', '{"full_name": "סוכן", "phone": "052-777-0000"}');
  update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000f4';
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000f4", "role": "authenticated"}', true);
update public.profiles set phone = '0527771111' where id = '00000000-0000-0000-0000-0000000000f4';
reset role;

do $$
begin
  assert (select recruiting_agent_id from public.properties where id = '10000000-0000-0000-0000-0000000000f4')
    = '00000000-0000-0000-0000-0000000000f4', 'fixing your phone should still hand you the sellers recruited for you';
  raise notice 'HAND-OVER TEST PASSED';
end $$;

-- ---- Hand-over fixes (2026-10-28) -------------------------------------------
do $$
begin
  -- Removing a team row keeps the buyers and sellers on the agent's account.
  insert into public.office_agents (id, full_name, phone)
    values ('40000000-0000-0000-0000-000000000005', 'סוכן א ברשימה', '053-111-2222');
  update public.office_agents set profile_id = '00000000-0000-0000-0000-0000000000a1'
   where id = '40000000-0000-0000-0000-000000000005';
  insert into public.buyers (id, full_name, owner_agent_id)
    values ('20000000-0000-0000-0000-0000000000a5', 'קונה של סוכן א', '00000000-0000-0000-0000-0000000000a1');
  assert (select recruiter_id from public.buyers where id = '20000000-0000-0000-0000-0000000000a5')
    = '40000000-0000-0000-0000-000000000005', 'the buyer should show the agent''s team row';
  delete from public.office_agents where id = '40000000-0000-0000-0000-000000000005';
  assert (select owner_agent_id from public.buyers where id = '20000000-0000-0000-0000-0000000000a5')
    = '00000000-0000-0000-0000-0000000000a1', 'removing the team row must keep the buyer with the agent';
  assert (select recruiting_agent_id from public.properties where id = '10000000-0000-0000-0000-000000000001')
    = '00000000-0000-0000-0000-0000000000a1', 'removing the team row must keep the seller with the agent';

  -- A pending user typing a colleague's phone gets nothing.
  insert into public.office_agents (id, full_name, phone)
    values ('40000000-0000-0000-0000-000000000006', 'עמית שלא נרשם', '054-333-4444');
  insert into public.buyers (id, full_name, recruiter_id)
    values ('20000000-0000-0000-0000-0000000000a6', 'קונה של העמית', '40000000-0000-0000-0000-000000000006');
  insert into auth.users (id, email, raw_user_meta_data) values
    ('00000000-0000-0000-0000-0000000000c2', 'pending2@test.local', '{"full_name": "ממתין שני"}');
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000c2", "role": "authenticated"}', true);
update public.profiles set phone = '0543334444' where id = '00000000-0000-0000-0000-0000000000c2';

-- Commission %: agents can't read it, not even their own row directly; the RPC shows only their own.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
do $$
begin
  begin
    perform commission_split from public.profiles;
    raise exception 'an agent must not read commission_split';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.profiles) >= 3, 'agents still see the team''s names';
  assert (select count(*) from public.agent_commission_rates()) = 1, 'an agent sees only their own rate';
end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);
do $$
begin
  assert (select count(*) from public.agent_commission_rates()) >= 3, 'the admin sees every rate';
end $$;
update public.profiles set commission_split = 60 where id = '00000000-0000-0000-0000-0000000000a1';
reset role;

do $$
begin
  assert (select profile_id is null from public.office_agents where id = '40000000-0000-0000-0000-000000000006'),
    'a pending user must not link by typing a colleague''s phone';
  assert (select owner_agent_id is null from public.buyers where id = '20000000-0000-0000-0000-0000000000a6'),
    'a pending user must not receive a colleague''s buyers';
  assert (select commission_split from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') = 60,
    'the admin can still change an agent''s rate';
  raise notice 'HAND-OVER FIX TESTS PASSED';
end $$;

rollback;
