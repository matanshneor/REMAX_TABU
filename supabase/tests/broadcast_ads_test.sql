-- =============================================================================
-- Tests for "שדר לכולם" (properties.broadcast) and "המודעות שלי" (saved_ads).
-- Runs inside a transaction that is rolled back. Any failed check aborts with an error.
--   psql "$DATABASE_URL" -f supabase/tests/broadcast_ads_test.sql
-- =============================================================================
begin;

-- ---- Seed (as postgres, RLS bypassed) ---------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.local',   '{"full_name": "מנהל"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'agent.a@test.local', '{"full_name": "סוכן א", "phone": "050-1111111"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'agent.b@test.local', '{"full_name": "סוכן ב", "phone": "050-2222222"}');
update public.profiles set status = 'active';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set phone = '050-1111111' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set phone = '050-2222222' where id = '00000000-0000-0000-0000-0000000000b1';
insert into public.office_agents (full_name, phone) values ('סוכן א', '050-1111111'), ('סוכן ב', '050-2222222'), ('בלי חשבון', '050-3333333');
update public.office_agents o set profile_id = p.id from public.profiles p
 where public.phone_key(o.phone) = public.phone_key(p.phone) and o.profile_id is null;

insert into public.properties (id, city, street, recruiting_agent_id, is_exclusive, current_price, rooms) values
  ('10000000-0000-0000-0000-000000000001', 'רמת גן',  'הרצל', '00000000-0000-0000-0000-00000000000a', true,  2450000, 4),
  ('10000000-0000-0000-0000-000000000002', 'תל אביב', 'דיזנגוף', '00000000-0000-0000-0000-0000000000a1', false, 3000000, 3);
insert into public.property_owner_details (property_id, owner_name, owner_phone) values
  ('10000000-0000-0000-0000-000000000001', 'מוכר של המנהל', '050-0000001'),
  ('10000000-0000-0000-0000-000000000002', 'מוכר של סוכן א', '050-0000002');

set local role authenticated;

-- ---- Broadcast ----------------------------------------------------------------
-- Agent B sees neither seller yet, and cannot broadcast.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}', true);
do $$
begin
  assert (select count(*) from public.properties) = 0, 'B sees no sellers before broadcast';
  begin
    -- sees nothing, so nothing changes (the API always filters; Supabase refuses unfiltered updates)
    update public.properties set broadcast = true where id is not null;
    assert (select count(*) from public.properties) = 0, 'B still sees nothing';
  end;
end $$;

-- Agent A cannot broadcast their own seller.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
do $$
begin
  begin
    update public.properties set broadcast = true where id = '10000000-0000-0000-0000-000000000002';
    raise exception 'agent broadcast should fail';
  exception when insufficient_privilege then null;
  end;
end $$;

-- The manager broadcasts their own seller and agent A's.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);
update public.properties set broadcast = true;

reset role;
do $$
begin
  assert (select count(*) from public.properties where broadcast and broadcast_at is not null) = 2, 'broadcast_at stamped';
  -- 2 properties x 2 agents (the manager is not notified of their own broadcast).
  assert (select count(*) from public.notifications where kind = 'property_broadcast') = 4, 'agents notified';
  assert not exists (select 1 from public.notifications where kind = 'property_broadcast'
                      and recipient_id = '00000000-0000-0000-0000-00000000000a'), 'manager not notified';
  assert (select body from public.notifications where kind = 'property_broadcast'
           and link = '/properties?open=10000000-0000-0000-0000-000000000001' limit 1)
         = 'הרצל, רמת גן · 4 חד׳ · 2,450,000 ₪', 'notification text';
end $$;
set local role authenticated;

-- Agent B now sees both, with the seller details, and can edit even the exclusive one,
-- but not its exclusivity, recruiter or broadcast flag.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}', true);
do $$
declare n integer;
begin
  assert (select count(*) from public.properties) = 2, 'B sees broadcast sellers';
  assert (select count(*) from public.property_owner_details) = 2, 'B sees broadcast seller details';
  update public.properties set current_price = 2400000 where id = '10000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'B edits a broadcast exclusive seller';
  update public.property_owner_details set owner_phone = '050-0000009'
   where property_id = '10000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'B edits the seller details of a broadcast exclusive seller';
  begin
    update public.properties set is_exclusive = false where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'B changing exclusivity should fail';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.properties set broadcast = false where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'B stopping the broadcast should fail';
  exception when insufficient_privilege then null;
  end;
end $$;

-- The manager stops one broadcast: B loses it again, and no new notification is sent.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);
update public.properties set broadcast = false where id = '10000000-0000-0000-0000-000000000002';
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}', true);
do $$
begin
  assert (select count(*) from public.properties) = 1, 'B sees only the one still broadcast';
end $$;

-- ---- Saved ads ----------------------------------------------------------------
-- The manager makes an ad with agent A on it: it is A's. B makes one for an agent without an account: it is B's.
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);
insert into public.saved_ads (id, title, agent_phone, agent_profile_id, created_by)
values ('30000000-0000-0000-0000-000000000001', 'מודעה של א', '0501111111',
        '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1');  -- spoofed owner fields are ignored
insert into storage.objects (bucket_id, name) values ('saved-ads', '30000000-0000-0000-0000-000000000001/ad.png');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000b1", "role": "authenticated"}', true);
insert into public.saved_ads (id, title, agent_phone) values ('30000000-0000-0000-0000-000000000002', 'מודעה של ב', '050-3333333');
insert into storage.objects (bucket_id, name) values ('saved-ads', '30000000-0000-0000-0000-000000000002/ad.png');
do $$
begin
  assert (select count(*) from public.saved_ads) = 1, 'B sees only own ad';
  assert (select agent_profile_id from public.saved_ads) = '00000000-0000-0000-0000-0000000000b1', 'no account -> maker';
  assert (select count(*) from storage.objects where bucket_id = 'saved-ads') = 1, 'B sees only own ad files';
  begin
    insert into storage.objects (bucket_id, name) values ('saved-ads', '30000000-0000-0000-0000-000000000001/x.png');
    raise exception 'B uploading into A''s ad should fail';
  exception when insufficient_privilege then null;
  end;
  delete from public.saved_ads where id = '30000000-0000-0000-0000-000000000001';  -- not visible: no-op
end $$;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}', true);
do $$
declare n integer;
begin
  assert (select count(*) from public.saved_ads) = 1, 'A sees the ad the manager made for them';
  assert (select created_by from public.saved_ads) = '00000000-0000-0000-0000-00000000000a', 'maker recorded';
  delete from storage.objects where bucket_id = 'saved-ads';
  delete from public.saved_ads where id = '30000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'A deletes their ad';
end $$;

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);
do $$
begin
  assert (select count(*) from public.saved_ads) = 1, 'manager sees all remaining ads';
  assert (select count(*) from storage.objects where bucket_id = 'saved-ads') = 1, 'A''s files were deleted';
end $$;

select 'all broadcast / saved-ads checks passed' as note;
rollback;
