-- =============================================================================
-- A Yad2 listing goes back to the pool when its seller is deleted
-- =============================================================================
-- "העבר למוכרים שלי" marks the listing 'added' and links it to the new seller. If that seller
-- was later deleted, property_id became null but the listing still said "הועבר למוכרים",
-- pointing at a seller that no longer exists. Now it returns to the open listings instead.
-- =============================================================================

create or replace function public.release_listing_of_deleted_property()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.market_listings
     set status = 'contacted', property_id = null, assigned_to = null, updated_at = now()
   where property_id = old.id and status = 'added';
  return old;
end;
$$;

create or replace trigger release_listing_on_property_delete
  before delete on public.properties
  for each row execute function public.release_listing_of_deleted_property();

-- Listings already left behind by a deleted seller.
update public.market_listings
   set status = 'contacted', assigned_to = null, updated_at = now()
 where status = 'added' and property_id is null;
