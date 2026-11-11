-- =============================================================================
-- Public website: the manager chooses which properties are on the site
-- =============================================================================
-- Until now the site showed every active listing the manager recruited, automatically.
-- The manager asked (11.11.2026) to decide property by property instead:
--   * A property is on the site only after the manager presses "העלאה לאתר" on it in the CRM
--     (properties.on_website). Only the manager can put a property on the site or take it off.
--   * Any agent's property can go on the site, at any stage of the agreement with the seller,
--     as long as it is active and has at least one photo.
--   * A property that stops being active (sold, frozen) leaves the site by itself. If it becomes
--     active again, the manager decides again.
--   * Each listing carries its own agent: name, title, phone, email, photo and license number.
--   * A new view, website_agents, lists the whole office team for the "המשרד שלנו" page, with a
--     few words about each agent (office_agents.website_bio, written in the CRM).
--
-- Existing data: nothing is deleted. The seven listings that are on the site today are marked
-- on_website = true, so the site looks the same the moment this runs.
--
-- Still hidden from the site: the seller, lead source, exclusivity, engagement, status, the
-- previous price, and every id of an agent or an account.
-- =============================================================================

alter table public.properties add column if not exists on_website boolean not null default false;
comment on column public.properties.on_website is 'On the public website. Set only by the manager ("העלאה לאתר").';

alter table public.office_agents add column if not exists website_bio text;
comment on column public.office_agents.website_bio is 'A few words about the agent, shown on the public website.';

-- -----------------------------------------------------------------------------
-- Who may put a property on the site, and when it leaves by itself
-- -----------------------------------------------------------------------------
create or replace function public.guard_property_website()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_was boolean := case when tg_op = 'UPDATE' then old.on_website else false end;
begin
  -- Sold or frozen: off the site, whoever made the change.
  if new.status <> 'active' and v_was and new.on_website then
    new.on_website := false;
    return new;
  end if;

  if new.on_website is distinct from v_was then
    if not (public.is_system() or public.is_admin()) then
      raise exception 'רק מנהל המשרד יכול להעלות נכס לאתר או להוריד אותו'
        using errcode = '42501';
    end if;
    if new.on_website then
      if new.status <> 'active' then
        raise exception 'אפשר להעלות לאתר רק נכס פעיל'
          using errcode = '23514';
      end if;
      if coalesce(cardinality(new.image_paths), 0) = 0 then
        raise exception 'אי אפשר להעלות לאתר נכס בלי תמונות. מוסיפים לפחות תמונה אחת, ואז מעלים.'
          using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_property_website() from public, anon, authenticated;

create or replace trigger guard_property_website
  before insert or update on public.properties
  for each row execute function public.guard_property_website();

-- The listings that are on the site today stay on it.
update public.properties
   set on_website = true
 where recruiter_id = website_private.agent_id()
   and status = 'active'
   and engagement <> 'recruiting'
   and coalesce(cardinality(image_paths), 0) > 0
   and not on_website;

-- -----------------------------------------------------------------------------
-- What the site reads
-- -----------------------------------------------------------------------------
-- An agent's title: the manager is the franchisee, the others are agents (as on the ads).
create or replace function website_private.agent_title(p_role text, p_gender text, p_fallback text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
           when p_role = 'admin' then case p_gender when 'female' then 'זכיינית' else 'זכיין' end
           else case p_gender when 'female' then 'סוכנת נדל"ן' when 'male' then 'סוכן נדל"ן' else coalesce(nullif(trim(p_fallback), ''), 'סוכן נדל"ן') end
         end;
$$;

revoke execute on function website_private.agent_title(text, text, text) from public;

create or replace function website_private.listings_v4()
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
  updated_at         timestamptz,
  house_number       text,
  apartment_number   text,
  garden_count       integer,
  rental_unit_count  integer,
  rental_unit_sqm    numeric,
  agent_name         text,
  agent_title        text,
  agent_phone        text,
  agent_email        text,
  agent_photo_url    text,
  agent_license      text
)
language sql
stable
security definer
set search_path = ''
as $$
  -- A property without an agent in the team list (there is none today) shows the manager.
  select p.id, p.city, p.neighborhood, p.street, p.property_type,
         p.floor, p.total_floors, p.rooms, p.size_sqm, p.current_price,
         p.eviction_date, p.eviction_immediate,
         p.has_safe_room, p.has_balcony, p.balcony_count, p.balcony_sqm,
         p.parking_spots, p.has_elevator, p.has_storage, p.is_renovated,
         p.has_garden, p.garden_sqm, p.has_rental_unit,
         p.description, p.image_paths, p.created_at, p.updated_at,
         p.house_number, p.apartment_number,
         p.garden_count, p.rental_unit_count, p.rental_unit_sqm,
         o.full_name,
         website_private.agent_title(pr.role::text, o.gender, o.role),
         o.phone,
         coalesce(nullif(trim(o.email), ''), pr.email),
         o.photo_url,
         nullif(trim(o.license), '')
    from public.properties p
    left join public.office_agents o on o.id = coalesce(p.recruiter_id, website_private.agent_id())
    left join public.profiles pr on pr.id = o.profile_id
   where p.on_website
     and p.status = 'active';
$$;

revoke execute on function website_private.listings_v4() from public;
grant execute on function website_private.listings_v4() to anon, authenticated, service_role;

-- Same columns in the same order, plus the agent's six at the end; grants on the view are kept.
create or replace view public.website_properties with (security_invoker = true) as
  select * from website_private.listings_v4();

comment on view public.website_properties is 'Public website: the properties the manager put on the site, public fields only, each with its agent''s contact details.';

-- The office team, the manager first.
create or replace function website_private.agents()
returns table (full_name text, title text, phone text, email text, photo_url text, license text, bio text, is_manager boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select o.full_name,
         website_private.agent_title(pr.role::text, o.gender, o.role),
         o.phone,
         coalesce(nullif(trim(o.email), ''), pr.email),
         o.photo_url,
         nullif(trim(o.license), ''),
         nullif(trim(o.website_bio), ''),
         o.id = website_private.agent_id()
    from public.office_agents o
    left join public.profiles pr on pr.id = o.profile_id
   order by (o.id = website_private.agent_id()) desc, o.full_name;
$$;

revoke execute on function website_private.agents() from public;
grant execute on function website_private.agents() to anon, authenticated, service_role;

create or replace view public.website_agents with (security_invoker = true) as
  select * from website_private.agents();

comment on view public.website_agents is 'Public website: the office team (name, title, phone, email, photo, license, a few words).';

revoke all on public.website_agents from anon, authenticated;
grant select on public.website_agents to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Instant refresh of the site
-- -----------------------------------------------------------------------------
-- Now: a property that is on the site or just left it (whoever its agent is), and any change in
-- the team list.
create or replace function website_private.notify_site()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id     uuid;
  v_url    text;
  v_secret text;
begin
  if tg_table_name = 'properties' then
    if tg_op = 'DELETE' then
      if not old.on_website then
        return null;
      end if;
      v_id := old.id;
    elsif tg_op = 'INSERT' then
      if not new.on_website then
        return null;
      end if;
      v_id := new.id;
    else
      if not (old.on_website or new.on_website) then
        return null;
      end if;
      v_id := new.id;
    end if;
  elsif tg_table_name = 'profiles' then
    if not exists (select 1 from public.office_agents o where o.profile_id = new.id) then
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

create or replace trigger zz_website_refresh
  after insert or delete or update of full_name, phone, email, photo_url, license, role, gender, website_bio, profile_id
  on public.office_agents
  for each row execute function website_private.notify_site();
