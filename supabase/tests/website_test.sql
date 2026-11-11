-- =============================================================================
-- Public website tests (migration 20261123000000_public_website).
-- What the anonymous visitor can read, the photos it may open, and the refresh calls.
-- Runs inside a transaction that is rolled back, so it leaves no data behind.
-- Any failed check aborts with an error.
-- =============================================================================
begin;

-- ---- Seed (as postgres, RLS bypassed) ---------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'manager@test.local', '{"full_name": "מנהל בדיקה", "phone": "050-1110001"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'other@test.local',   '{"full_name": "סוכן אחר",  "phone": "050-1110002"}');

-- The manager's fixed team-list row (already there on the live database).
insert into public.office_agents (id, full_name, phone)
values ('63a51f45-fdef-4797-855d-12d8b9405960', 'מנהל בדיקה', '050-1110001')
on conflict (id) do nothing;
insert into public.office_agents (id, full_name, phone, profile_id)
values ('40000000-0000-0000-0000-0000000000e2', 'סוכן אחר', '050-1110002', '00000000-0000-0000-0000-0000000000e2');

insert into public.properties (id, city, neighborhood, street, house_number, apartment_number, property_type,
                               rooms, current_price, status, engagement, recruiter_id, lead_source, image_paths) values
  -- on the site
  ('50000000-0000-0000-0000-000000000001', 'ירושלים', 'גילה', 'הרב בצלאל', '12', '3', 'דירה', 4, 2500000, 'active', 'consent',
   '63a51f45-fdef-4797-855d-12d8b9405960', 'יד2',
   array['50000000-0000-0000-0000-000000000001/a.jpg', '50000000-0000-0000-0000-000000000001/b.jpg']),
  ('50000000-0000-0000-0000-000000000006', 'ירושלים', 'הר חומה', 'אבא חושי', '7', null, 'בית פרטי', 6, 4200000, 'active', 'exclusive',
   '63a51f45-fdef-4797-855d-12d8b9405960', null, array['50000000-0000-0000-0000-000000000006/a.jpg']),
  -- sold, frozen, still being recruited (never put on the site), and another agent's (put on the site below)
  ('50000000-0000-0000-0000-000000000002', 'ירושלים', 'גילה', 'א', '1', null, 'דירה', 3, 1000000, 'sold', 'consent',
   '63a51f45-fdef-4797-855d-12d8b9405960', null, '{}'),
  ('50000000-0000-0000-0000-000000000003', 'ירושלים', 'גילה', 'ב', '2', null, 'דירה', 3, 1000000, 'frozen', 'consent',
   '63a51f45-fdef-4797-855d-12d8b9405960', null, '{}'),
  ('50000000-0000-0000-0000-000000000004', 'ירושלים', 'גילה', 'ג', '3', null, 'דירה', 3, 1000000, 'active', 'recruiting',
   '63a51f45-fdef-4797-855d-12d8b9405960', null, '{}'),
  ('50000000-0000-0000-0000-000000000005', 'ירושלים', 'גילה', 'ד', '4', null, 'דירה', 3, 1000000, 'active', 'consent',
   '40000000-0000-0000-0000-0000000000e2', null, array['50000000-0000-0000-0000-000000000005/x.jpg']);

-- Extra details of the first listing: the garden count is public on the site, the other two are not.
update public.properties
   set garden_count = 2, virtual_tour_url = 'https://tour.test/1', previous_price = 2700000
 where id = '50000000-0000-0000-0000-000000000001';

-- The manager is the office admin.
update public.profiles set role = 'admin', status = 'active' where id = '00000000-0000-0000-0000-0000000000e1';
update public.profiles set status = 'active' where id = '00000000-0000-0000-0000-0000000000e2';
update public.office_agents set license = '1234567', website_bio = 'כמה מילים על הסוכן'
 where id = '40000000-0000-0000-0000-0000000000e2';

-- On the site: what the manager put there (migration website_publish). Two of the manager's
-- own and the other agent's. The recruiting-stage one could go up too, but nobody pressed.
update public.properties set on_website = true
 where id in ('50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000006',
              '50000000-0000-0000-0000-000000000005');

insert into public.property_owner_details (property_id, owner_name, owner_phone)
values ('50000000-0000-0000-0000-000000000001', 'בעלים סודי', '050-9990001');

insert into storage.objects (bucket_id, name) values
  ('property-media', '50000000-0000-0000-0000-000000000001/a.jpg'),
  ('property-media', '50000000-0000-0000-0000-000000000001/b.jpg'),
  ('property-media', '50000000-0000-0000-0000-000000000001/removed.jpg'),  -- no longer in image_paths
  ('property-media', '50000000-0000-0000-0000-000000000005/x.jpg'),        -- another agent's property, on the site
  ('property-media', '50000000-0000-0000-0000-000000000004/y.jpg');        -- a property that is not on the site

do $$
declare
  v_cols text;
begin
  -- The view has exactly the public fields, nothing more.
  select string_agg(column_name, ',' order by ordinal_position) into v_cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'website_properties';
  assert v_cols = 'id,city,neighborhood,street,property_type,floor,total_floors,rooms,size_sqm,current_price,'
                  'eviction_date,eviction_immediate,has_safe_room,has_balcony,balcony_count,balcony_sqm,'
                  'parking_spots,has_elevator,has_storage,is_renovated,has_garden,garden_sqm,has_rental_unit,'
                  'description,image_paths,created_at,updated_at,house_number,apartment_number,'
                  'garden_count,rental_unit_count,rental_unit_sqm,'
                  'agent_name,agent_title,agent_phone,agent_email,agent_photo_url,agent_license',
    'website_properties has unexpected columns: ' || v_cols;

  select string_agg(column_name, ',' order by ordinal_position) into v_cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'website_agent';
  assert v_cols = 'full_name,phone,email,photo_url', 'website_agent has unexpected columns: ' || v_cols;

  select string_agg(column_name, ',' order by ordinal_position) into v_cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'website_agents';
  assert v_cols = 'full_name,title,phone,email,photo_url,license,bio,is_manager', 'website_agents has unexpected columns: ' || v_cols;

  -- The recruiter trigger gave the manager's properties to the manager's account.
  assert (select recruiting_agent_id from public.properties where id = '50000000-0000-0000-0000-000000000001')
         = (select profile_id from public.office_agents where id = '63a51f45-fdef-4797-855d-12d8b9405960'),
    'manager''s property should belong to the manager''s account';
end $$;

-- ---- As the anonymous visitor -----------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

do $$
declare
  v_ids uuid[];
  v_names text[];
  v_table text;
begin
  select array_agg(id order by id) into v_ids
    from public.website_properties where id::text like '50000000-%';
  assert v_ids = array['50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000005',
                       '50000000-0000-0000-0000-000000000006']::uuid[],
    'site should show exactly the properties the manager put on it, got ' || coalesce(v_ids::text, 'none');

  -- Each listing carries its own agent.
  assert (select agent_name = 'סוכן אחר' and agent_phone = '050-111-0002' and agent_email = 'other@test.local'
                 and agent_license = '1234567' and agent_title = 'סוכן נדל"ן'
            from public.website_properties where id = '50000000-0000-0000-0000-000000000005'),
    'the other agent''s listing should carry that agent''s details, got '
      || (select row(agent_name, agent_phone, agent_email, agent_license, agent_title)::text from public.website_properties where id = '50000000-0000-0000-0000-000000000005');
  assert (select agent_name = 'מנהל בדיקה' and agent_title = 'זכיין'
            from public.website_properties where id = '50000000-0000-0000-0000-000000000001'),
    'the manager''s listing should carry the manager''s details';

  -- The team page: everyone in the team list, the manager first.
  assert (select count(*) from public.website_agents where full_name in ('מנהל בדיקה', 'סוכן אחר')) = 2,
    'the team list should include both agents';
  assert (select is_manager and full_name = 'מנהל בדיקה' from public.website_agents limit 1), 'the manager should come first';
  assert (select bio = 'כמה מילים על הסוכן' from public.website_agents where full_name = 'סוכן אחר'), 'the agent''s words should show';

  assert (select count(*) from public.website_agent) = 1, 'site should see exactly one agent';
  assert (select phone is not null and email is not null from public.website_agent), 'agent phone and email should be set';

  -- Photos: only those listed on a property that is on the site.
  select array_agg(name order by name) into v_names
    from storage.objects where bucket_id = 'property-media' and name like '50000000-%';
  assert v_names = array['50000000-0000-0000-0000-000000000001/a.jpg', '50000000-0000-0000-0000-000000000001/b.jpg',
                         '50000000-0000-0000-0000-000000000005/x.jpg'],
    'site should open only the listed photos of its own properties, got ' || coalesce(v_names::text, 'none');

  -- No table at all, not even with RLS returning nothing.
  foreach v_table in array array['properties', 'property_owner_details', 'buyers', 'buyer_notes', 'buyer_property_viewings',
                                 'profiles', 'office_agents', 'notifications', 'tasks', 'deals', 'financial_transactions',
                                 'candidates', 'market_listings', 'calendar_feeds', 'intake_keys', 'inbound_emails'] loop
    begin
      execute format('select 1 from public.%I limit 1', v_table);
      raise exception 'anon could read table %', v_table;
    exception when insufficient_privilege then
      null;  -- expected
    end;
  end loop;

  -- The listing's own extra details are public (migration website_more_details).
  assert (select garden_count from public.website_properties where id = '50000000-0000-0000-0000-000000000001') = 2,
    'site should show the number of gardens';
  -- The previous price and the virtual tour link stay in the CRM.
  begin
    execute 'select previous_price from public.website_properties limit 1';
    raise exception 'the site view shows the previous price';
  exception when undefined_column then
    null;  -- expected
  end;
  begin
    execute 'select virtual_tour_url from public.website_properties limit 1';
    raise exception 'the site view shows the virtual tour link';
  exception when undefined_column then
    null;  -- expected
  end;

  -- The address is public (house and apartment number), the seller is not.
  assert (select house_number from public.website_properties where id = '50000000-0000-0000-0000-000000000001') = '12',
    'site should show the house number';
  begin
    execute 'select owner_name from public.property_owner_details limit 1';
    raise exception 'anon could read the seller''s name';
  exception when insufficient_privilege then
    null;
  end;

  -- Read only.
  begin
    delete from public.website_properties;
    raise exception 'anon could delete through the view';
  exception when insufficient_privilege or object_not_in_prerequisite_state or feature_not_supported then
    null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('property-media', '50000000-0000-0000-0000-000000000001/new.jpg');
    raise exception 'anon could upload a photo';
  exception when insufficient_privilege then
    null;
  end;

  raise notice 'WEBSITE READ TESTS PASSED';
end $$;

-- ---- The backend (service_role) reads the views too --------------------------
reset role;
set local role service_role;
do $$
begin
  assert (select count(*) from public.website_properties where id::text like '50000000-%') = 3,
    'the backend should read the site''s listings';
  assert (select count(*) from public.website_agent) = 1, 'the backend should read the site''s agent';
  assert (select count(*) from public.website_agents) >= 2, 'the backend should read the team';
end $$;

-- ---- Who may put a property on the site --------------------------------------
reset role;
update public.properties set image_paths = array['50000000-0000-0000-0000-000000000004/y.jpg']
 where id = '50000000-0000-0000-0000-000000000004';

-- The other agent, signed in: not theirs to decide, not even for their own property.
set local role authenticated;
select set_config('request.jwt.claims', '{"role": "authenticated", "sub": "00000000-0000-0000-0000-0000000000e2"}', true);
do $$
begin
  begin
    update public.properties set on_website = false where id = '50000000-0000-0000-0000-000000000005';
    raise exception 'an agent took a property off the site';
  exception when insufficient_privilege then
    null;  -- expected
  end;
  begin
    insert into public.properties (city, status, engagement, on_website, image_paths)
    values ('ירושלים', 'active', 'consent', true, array['x/y.jpg']);
    raise exception 'an agent added a property straight onto the site';
  exception when insufficient_privilege then
    null;  -- expected
  end;
  -- Everything else about their property is still theirs to edit, and it stays on the site.
  update public.properties set current_price = 1010000 where id = '50000000-0000-0000-0000-000000000005';
  assert (select on_website and current_price = 1010000 from public.properties where id = '50000000-0000-0000-0000-000000000005'),
    'an agent''s edit should keep the property on the site';
end $$;

-- The manager, signed in.
select set_config('request.jwt.claims', '{"role": "authenticated", "sub": "00000000-0000-0000-0000-0000000000e1"}', true);
do $$
begin
  -- A property at the recruiting stage can go up: the manager's press is the approval.
  update public.properties set on_website = true where id = '50000000-0000-0000-0000-000000000004';
  assert (select on_website from public.properties where id = '50000000-0000-0000-0000-000000000004'), 'the manager should put a property on the site';
  update public.properties set on_website = false where id = '50000000-0000-0000-0000-000000000004';

  -- Not without a photo, and not a sold or frozen one.
  begin
    update public.properties set image_paths = '{}', on_website = true where id = '50000000-0000-0000-0000-000000000004';
    raise exception 'a property without photos went on the site';
  exception when check_violation then
    null;  -- expected
  end;
  begin
    update public.properties set on_website = true, image_paths = array['a/b.jpg'] where id = '50000000-0000-0000-0000-000000000003';
    raise exception 'a frozen property went on the site';
  exception when check_violation then
    null;  -- expected
  end;

  -- Frozen: off the site by itself, and it does not come back by itself.
  update public.properties set status = 'frozen' where id = '50000000-0000-0000-0000-000000000006';
  assert (select not on_website from public.properties where id = '50000000-0000-0000-0000-000000000006'), 'a frozen property should leave the site';
  update public.properties set status = 'active' where id = '50000000-0000-0000-0000-000000000006';
  assert (select not on_website from public.properties where id = '50000000-0000-0000-0000-000000000006'), 'an unfrozen property should wait for the manager';
  update public.properties set on_website = true where id = '50000000-0000-0000-0000-000000000006';

  raise notice 'WEBSITE PUBLISH TESTS PASSED';
end $$;

-- ---- Refresh calls (as postgres again) --------------------------------------
reset role;

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'website_revalidate_url') then
    perform vault.create_secret('https://site.test.local/api/revalidate', 'website_revalidate_url');
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'website_revalidate_secret') then
    perform vault.create_secret('test-secret', 'website_revalidate_secret');
  end if;
end $$;

create temp table calls_before as
  select coalesce(max(id), 0) as last_id from net.http_request_queue;

-- Calls to the site since the start, read a batch at a time by take_calls().
create temp table seen (n int);
insert into seen values (0);

create function pg_temp.new_calls() returns setof jsonb language sql as $$
  select convert_from(q.body, 'utf8')::jsonb
    from net.http_request_queue q, calls_before b
   where q.id > b.last_id
     and q.url = (select decrypted_secret from vault.decrypted_secrets where name = 'website_revalidate_url')
   order by q.id
  offset (select n from seen);
$$;

create function pg_temp.take_calls() returns jsonb[] language plpgsql as $$
declare v jsonb[];
begin
  select coalesce(array_agg(c), '{}') into v from pg_temp.new_calls() c;
  update seen set n = n + cardinality(v);
  return v;
end $$;

do $$
declare
  v jsonb[];
begin
  -- A property that is not on the site: no call.
  update public.properties set current_price = 990000 where id = '50000000-0000-0000-0000-000000000004';
  v := pg_temp.take_calls();
  assert cardinality(v) = 0, 'a property that is not on the site should not refresh it, got ' || v::text;

  -- Another agent's property that is on the site: one call.
  update public.properties set current_price = 995000 where id = '50000000-0000-0000-0000-000000000005';
  v := pg_temp.take_calls();
  assert cardinality(v) = 1 and v[1] ->> 'id' = '50000000-0000-0000-0000-000000000005',
    'another agent''s listing on the site should refresh it, got ' || v::text;

  -- The manager's property: one call with its id.
  update public.properties set current_price = 2450000 where id = '50000000-0000-0000-0000-000000000001';
  v := pg_temp.take_calls();
  assert cardinality(v) = 1 and v[1] ->> 'id' = '50000000-0000-0000-0000-000000000001' and v[1] ->> 'op' = 'UPDATE',
    'price change should refresh the site once, got ' || v::text;

  -- Put on the site, then taken off: both refresh.
  update public.properties set on_website = true where id = '50000000-0000-0000-0000-000000000004';
  update public.properties set on_website = false where id = '50000000-0000-0000-0000-000000000004';
  v := pg_temp.take_calls();
  assert cardinality(v) = 2, 'putting a property on the site and taking it off should refresh twice, got ' || v::text;

  -- Sold: it leaves the site, and the site hears about it.
  update public.properties set status = 'sold' where id = '50000000-0000-0000-0000-000000000006';
  v := pg_temp.take_calls();
  assert cardinality(v) = 1 and (select not on_website from public.properties where id = '50000000-0000-0000-0000-000000000006'),
    'a sold listing should leave the site and refresh it, got ' || v::text;

  -- New (not on the site) and deleted (was not on the site): no call. Deleting a listing: one call.
  insert into public.properties (id, city, status, engagement, recruiter_id)
  values ('50000000-0000-0000-0000-000000000007', 'ירושלים', 'active', 'consent', '63a51f45-fdef-4797-855d-12d8b9405960');
  delete from public.properties where id = '50000000-0000-0000-0000-000000000002';
  v := pg_temp.take_calls();
  assert cardinality(v) = 0, 'properties that are not on the site should not refresh it, got ' || v::text;
  delete from public.properties where id = '50000000-0000-0000-0000-000000000005';
  v := pg_temp.take_calls();
  assert cardinality(v) = 1 and v[1] ->> 'op' = 'DELETE' and v[1] ->> 'id' = '50000000-0000-0000-0000-000000000005',
    'deleting a listing should refresh the site, got ' || v::text;

  -- Any agent's details refresh the site (every agent is on the team page).
  update public.office_agents set phone = '050-1110009' where id = '63a51f45-fdef-4797-855d-12d8b9405960';
  update public.office_agents set website_bio = 'מילים חדשות' where id = '40000000-0000-0000-0000-0000000000e2';
  v := pg_temp.take_calls();
  assert cardinality(v) = 2 and v[1] ->> 'table' = 'office_agents', 'a change in the team list should refresh, got ' || v::text;

  -- The secret travels in the header.
  assert (select q.headers ->> 'x-revalidate-secret' from net.http_request_queue q order by q.id desc limit 1)
         = (select decrypted_secret from vault.decrypted_secrets where name = 'website_revalidate_secret'),
    'refresh call should carry the secret header';

  raise notice 'WEBSITE REFRESH TESTS PASSED';
end $$;

rollback;
