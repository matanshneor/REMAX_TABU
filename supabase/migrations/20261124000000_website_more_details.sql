-- =============================================================================
-- Public website: more of the listing's own details
-- =============================================================================
-- The manager asked (11.11.2026) that a listing's page show as many of its details as it can.
-- Three more fields of the listing join website_properties, at the end:
--   garden_count, rental_unit_count, rental_unit_sqm  (how many gardens / rental units, and their size)
-- The CRM already sends all three to buyers in its own WhatsApp message.
--
-- Still hidden, as before: the seller (property_owner_details), lead_source, the exclusivity
-- fields, engagement, status, the previous price, the virtual tour link (the office has none),
-- and every agent id.
--
-- Nothing is deleted and no data changes. A function's columns can't be changed in place, so the
-- view now reads listings_v3(); listings() and listings_v2() stay, unused.
-- =============================================================================

create or replace function website_private.listings_v3()
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
  rental_unit_sqm    numeric
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
         p.house_number, p.apartment_number,
         p.garden_count, p.rental_unit_count, p.rental_unit_sqm
    from public.properties p
   where p.recruiter_id = website_private.agent_id()
     and p.status = 'active'
     and p.engagement <> 'recruiting';
$$;

revoke execute on function website_private.listings_v3() from public;
grant execute on function website_private.listings_v3() to anon, authenticated, service_role;

-- Same columns in the same order, plus the three at the end; grants on the view are kept.
create or replace view public.website_properties with (security_invoker = true) as
  select * from website_private.listings_v3();
