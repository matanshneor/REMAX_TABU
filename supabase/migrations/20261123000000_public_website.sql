-- =============================================================================
-- Public website (website/): the office manager's listings, readable without signing in
-- =============================================================================
-- The site shows only the properties the manager recruited that are on the market, and
-- the manager's own contact details. It reads with the publishable (anon) key, and that key
-- can read exactly two views and nothing else:
--   * website_properties: active listings (not ones still being recruited, which have no
--     seller consent yet), public fields only. No house or apartment number, seller,
--     lead source, exclusivity, engagement or agent ids.
--   * website_agent: name, phone, email and photo.
-- The views read through SECURITY DEFINER functions in website_private, a schema the API
-- does not expose, so anon gets no grant on any table. The agent is fixed by their
-- team-list id (not by the admin role), so adding another admin does not change the site.
--
-- Photos: anon may read a property-media object only when it is listed in image_paths of a
-- property on the site (a photo removed from the listing stays closed). The bucket stays private.
--
-- Instant refresh: every insert, update or delete of the manager's properties (and changes to
-- their contact details) posts to the site's revalidate URL with a secret header, through
-- pg_net. The URL and the secret live in Vault (website_revalidate_url,
-- website_revalidate_secret), not in this file. Until both are set, nothing is sent.
-- =============================================================================

create extension if not exists pg_net with schema extensions;

create schema if not exists website_private;
revoke all on schema website_private from public;
grant usage on schema website_private to anon, authenticated;

-- The manager's row in the office team list (office_agents).
create or replace function website_private.agent_id()
returns uuid
language sql
immutable
set search_path = ''
as $$
  select '63a51f45-fdef-4797-855d-12d8b9405960'::uuid;
$$;

revoke execute on function website_private.agent_id() from public;

create or replace function website_private.listings()
returns table (
  id                 uuid,
  city               text,
  neighborhood       text,
  street             text,
  property_type      text,
  floor              integer,
  total_floors       integer,
  rooms              numeric,
  size_sqm           numeric,
  current_price      numeric,
  eviction_date      date,
  eviction_immediate boolean,
  has_safe_room      boolean,
  has_balcony        boolean,
  balcony_count      integer,
  balcony_sqm        numeric,
  parking_spots      integer,
  has_elevator       boolean,
  has_storage        boolean,
  is_renovated       boolean,
  has_garden         boolean,
  garden_sqm         numeric,
  has_rental_unit    boolean,
  description        text,
  image_paths        text[],
  created_at         timestamptz,
  updated_at         timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.city, p.neighborhood, p.street, p.property_type,
         p.floor, p.total_floors, p.rooms, p.size_sqm, p.current_price,
         p.eviction_date, p.eviction_immediate,
         p.has_safe_room, p.has_balcony, p.balcony_count, p.balcony_sqm,
         p.parking_spots, p.has_elevator, p.has_storage, p.is_renovated,
         p.has_garden, p.garden_sqm, p.has_rental_unit,
         p.description, p.image_paths, p.created_at, p.updated_at
    from public.properties p
   where p.recruiter_id = website_private.agent_id()
     and p.status = 'active'
     and p.engagement <> 'recruiting';
$$;

revoke execute on function website_private.listings() from public;
grant execute on function website_private.listings() to anon, authenticated;

create or replace function website_private.agent()
returns table (full_name text, phone text, email text, photo_url text)
language sql
stable
security definer
set search_path = ''
as $$
  -- The team-list email when filled in, otherwise the email of the CRM account.
  select o.full_name, o.phone, coalesce(nullif(trim(o.email), ''), pr.email), o.photo_url
    from public.office_agents o
    left join public.profiles pr on pr.id = o.profile_id
   where o.id = website_private.agent_id();
$$;

revoke execute on function website_private.agent() from public;
grant execute on function website_private.agent() to anon, authenticated;

create view public.website_properties with (security_invoker = true) as
  select * from website_private.listings();

create view public.website_agent with (security_invoker = true) as
  select * from website_private.agent();

comment on view public.website_properties is 'Public website: the manager''s active listings, public fields only.';
comment on view public.website_agent is 'Public website: the manager''s name, phone, email and photo.';

-- anon reads the two views and no table. Every CRM screen needs a signed-in user, and the
-- open endpoints (ad tool, calendar feed) go through SECURITY DEFINER functions, which this
-- doesn't affect.
revoke all on all tables in schema public from anon;
revoke all on public.website_properties, public.website_agent from authenticated;
grant select on public.website_properties, public.website_agent to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Photos of the listings on the site
-- -----------------------------------------------------------------------------
create policy "property-media: website read" on storage.objects
  for select to anon
  using (
    bucket_id = 'property-media'
    and exists (
      select 1
        from public.website_properties w
       where w.id::text = split_part(name, '/', 1)
         and name = any (w.image_paths)
    )
  );

-- -----------------------------------------------------------------------------
-- Instant refresh of the site
-- -----------------------------------------------------------------------------
create or replace function website_private.notify_site()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agent  uuid := website_private.agent_id();
  v_id     uuid;
  v_url    text;
  v_secret text;
begin
  if tg_table_name = 'properties' then
    -- Only the manager's properties, including one that just moved to or from them.
    if tg_op = 'DELETE' then
      if old.recruiter_id is distinct from v_agent then
        return null;
      end if;
      v_id := old.id;
    elsif tg_op = 'INSERT' then
      if new.recruiter_id is distinct from v_agent then
        return null;
      end if;
      v_id := new.id;
    else
      if old.recruiter_id is distinct from v_agent and new.recruiter_id is distinct from v_agent then
        return null;
      end if;
      v_id := new.id;
    end if;
  elsif tg_table_name = 'office_agents' then
    if new.id <> v_agent then
      return null;
    end if;
  elsif tg_table_name = 'profiles' then
    if not exists (select 1 from public.office_agents o where o.id = v_agent and o.profile_id = new.id) then
      return null;
    end if;
  end if;

  select max(s.decrypted_secret) filter (where s.name = 'website_revalidate_url'),
         max(s.decrypted_secret) filter (where s.name = 'website_revalidate_secret')
    into v_url, v_secret
    from vault.decrypted_secrets s
   where s.name in ('website_revalidate_url', 'website_revalidate_secret');
  if v_url is null or v_secret is null then
    return null;
  end if;

  -- Queued with the transaction: a change that is rolled back sends nothing.
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('table', tg_table_name, 'op', tg_op, 'id', v_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-revalidate-secret', v_secret),
    timeout_milliseconds := 5000
  );
  return null;
end;
$$;

revoke execute on function website_private.notify_site() from public, anon, authenticated;

create trigger zz_website_refresh
  after insert or update or delete on public.properties
  for each row execute function website_private.notify_site();
create trigger zz_website_refresh
  after update of full_name, phone, email, photo_url on public.office_agents
  for each row execute function website_private.notify_site();
create trigger zz_website_refresh
  after update of email on public.profiles
  for each row execute function website_private.notify_site();
