-- =============================================================================
-- Gardens, balconies (how many, total size) and a free-text description on properties
-- =============================================================================
-- has_balcony stays the yes/no that search filters and buyer matching use. Filling in
-- the number of gardens / balconies or their size ticks the matching yes/no, so a
-- property entered with "2 balconies" is never missed by a buyer who needs one.
-- =============================================================================

alter table public.properties
  add column has_garden    boolean not null default false,
  add column garden_count  integer check (garden_count >= 0),
  add column garden_sqm    numeric(7, 2) check (garden_sqm >= 0),
  add column balcony_count integer check (balcony_count >= 0),
  add column balcony_sqm   numeric(7, 2) check (balcony_sqm >= 0),
  add column description   text;

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
  return new;
end;
$$;

revoke execute on function public.sync_property_outdoor() from public, anon, authenticated;

create trigger properties_sync_outdoor before insert or update of garden_count, garden_sqm, balcony_count, balcony_sqm, has_garden, has_balcony
  on public.properties
  for each row execute function public.sync_property_outdoor();

-- Entering balconies can tick has_balcony (above), which can make the property match
-- buyers who need one: let the match notification react to those fields too.
drop trigger properties_notify_matches on public.properties;
create trigger properties_notify_matches
  after insert or update of status, current_price, neighborhood, rooms, floor, property_type,
                            has_safe_room, has_elevator, has_balcony, balcony_count, balcony_sqm
  on public.properties
  for each row execute function public.notify_property_matches();
