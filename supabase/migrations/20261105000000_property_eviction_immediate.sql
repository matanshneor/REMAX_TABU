-- "פינוי מיידי": the property can be handed over right away, instead of on an eviction date.
-- The two exclude each other (the form clears the date when "מיידי" is on).
alter table public.properties
  add column eviction_immediate boolean not null default false,
  add constraint properties_eviction_immediate_no_date check (not eviction_immediate or eviction_date is null);
