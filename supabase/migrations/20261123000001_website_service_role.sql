-- The backend (service_role) reads the website views too: the lead endpoint checks that a lead's
-- property is on the site and describes it in the buyer's notes. service_role already has the
-- grant on the views; it also needs the functions behind them.
grant usage on schema website_private to service_role;
grant execute on function website_private.listings(), website_private.agent() to service_role;
