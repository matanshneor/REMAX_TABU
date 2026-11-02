-- No required fields on a seller: a property can be saved even without a city.
alter table public.properties alter column city drop not null;
