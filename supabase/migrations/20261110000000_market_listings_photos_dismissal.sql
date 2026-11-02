-- =============================================================================
-- מאגר יד2: a photo per listing, and who marked it "לא רלוונטי", when and why
-- =============================================================================
-- image_url  — the photo from Yad2's alert e-mail (an outside link)
-- image_path — a photo uploaded by hand (property-media bucket, listings/<id>/...); it moves
--              to the seller when the listing becomes one
-- dismissed_* — "לא רלוונטי": the reason (required in the app), who marked it and when.
-- Who moved a listing to sellers stays in assigned_to.
-- =============================================================================

alter table public.market_listings
  add column image_url        text,
  add column image_path       text,
  add column dismissed_reason text,
  add column dismissed_by     uuid references public.profiles (id) on delete set null,
  add column dismissed_at     timestamptz;
