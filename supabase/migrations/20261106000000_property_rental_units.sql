-- =============================================================================
-- Rental units (יחידות דיור): yes/no, how many, total size — like gardens and balconies
-- =============================================================================
-- Filling in the number of units or their size ticks has_rental_unit, so the
-- "יחידת דיור" filter sees it.
-- =============================================================================

alter table public.properties
  add column has_rental_unit   boolean not null default false,
  add column rental_unit_count integer check (rental_unit_count >= 0),
  add column rental_unit_sqm   numeric(7, 2) check (rental_unit_sqm >= 0);

create or replace function public.sync_property_outdoor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.garden_count > 0 or new.garden_sqm > 0 then
    new.has_garden := true;
  end if;
  if new.balcony_count > 0 or new.balcony_sqm > 0 then
    new.has_balcony := true;
  end if;
  if new.rental_unit_count > 0 or new.rental_unit_sqm > 0 then
    new.has_rental_unit := true;
  end if;
  return new;
end;
$$;

create or replace trigger properties_sync_outdoor
  before insert or update of garden_count, garden_sqm, balcony_count, balcony_sqm, has_garden, has_balcony,
                             rental_unit_count, rental_unit_sqm, has_rental_unit
  on public.properties
  for each row execute function public.sync_property_outdoor();
