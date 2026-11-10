-- =============================================================================
-- Public website, follow-up to 20261123000000_public_website
-- =============================================================================
-- 1. The full address may show: the manager decided (11.11.2026) that the house and apartment
--    numbers are public on the site. They join website_properties as two new columns at the end.
--    The seller's details stay hidden. (A function's columns can't be changed in place, so the
--    view now reads listings_v2(); the old listings() is no longer used.)
-- 2. The backend (service_role) reads the website views too: the lead endpoint checks that a
--    lead's property is on the site and describes it in the buyer's notes.
-- =============================================================================

create or replace function website_private.listings_v2()
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
  apartment_number   text
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
         p.description, p.image_paths, p.created_at, p.updated_at,
         p.house_number, p.apartment_number
    from public.properties p
   where p.recruiter_id = website_private.agent_id()
     and p.status = 'active'
     and p.engagement <> 'recruiting';
$$;

revoke execute on function website_private.listings_v2() from public;
grant execute on function website_private.listings_v2() to anon, authenticated, service_role;

-- Same columns in the same order, plus the two at the end; grants on the view are kept.
create or replace view public.website_properties with (security_invoker = true) as
  select * from website_private.listings_v2();

grant usage on schema website_private to service_role;
grant execute on function website_private.agent() to service_role;
