-- Buyer requirements and financing, as used by the office's buyers table.
-- The Pisgat Ze'ev area(s) reuse preferred_neighborhoods.

create type public.requirement as enum ('must', 'nice', 'any');

alter table public.buyers
  add column floor_min        integer,
  add column floor_max        integer,
  add column needs_balcony    public.requirement not null default 'any',
  add column needs_elevator   public.requirement not null default 'any',
  add column needs_safe_room  public.requirement not null default 'any',
  add column mortgage_approved boolean not null default false,
  add column sold_apartment   boolean not null default false,  -- already sold their current apartment
  add column equity           numeric(12, 0) check (equity >= 0),
  add constraint buyers_floor_range check (floor_min is null or floor_max is null or floor_min <= floor_max);
