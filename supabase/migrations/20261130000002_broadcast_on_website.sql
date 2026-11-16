-- =============================================================================
-- Every seller shared with the whole office is on the public site
-- =============================================================================
-- Sharing a seller ("שדר לכולם") now also puts it on the site (done by the app, in the same save).
-- The sellers that were shared before that change go up now, at the manager's request
-- (17.11.2026). Only active sellers with a photo can go up (the same rule as "העלאה לאתר").
-- =============================================================================

update public.properties
   set on_website = true
 where broadcast
   and not on_website
   and status = 'active'
   and coalesce(cardinality(image_paths), 0) > 0;
