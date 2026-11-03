-- =============================================================================
-- "מאגר יד 2": several photos per listing (they all move to the seller)
-- =============================================================================
-- image_paths replaces the single image_path (kept, no longer written by the app).
-- =============================================================================

alter table public.market_listings
  add column image_paths text[] not null default '{}';

update public.market_listings
  set image_paths = array[image_path]
  where image_path is not null;
