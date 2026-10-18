-- =============================================================================
-- Real Estate CRM — initial schema, RLS policies and storage buckets
-- =============================================================================
-- Business rules enforced here:
--   * Agents never delete. Only admins can DELETE (no DELETE policy for agents).
--   * Buyers: everyone reads. Once claimed (owner_agent_id set), only the owner
--     and admins can edit.
--   * Properties: everyone reads and edits, unless is_exclusive = true — then only
--     the recruiting agent and admins can edit.
--   * Property owner details: visible/editable only by the recruiting agent + admin.
--   * Financial transactions & candidates: admin only.
--   * Export is NOT enforceable in SQL (whoever can SELECT can copy). It is
--     handled by the backend /export endpoint, which is admin-only.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('agent', 'admin');
create type public.property_status as enum ('active', 'frozen', 'sold');
create type public.buyer_status as enum (
  'new', 'hot', 'warm', 'bought_with_us', 'bought_elsewhere', 'irrelevant'
);
create type public.transaction_type as enum ('income', 'expense');
create type public.candidate_status as enum (
  'new', 'interview_scheduled', 'passed_first', 'hired', 'rejected'
);

-- -----------------------------------------------------------------------------
-- Profiles (agents / users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text not null default '',
  phone            text,
  email            text not null,
  role             public.user_role not null default 'agent',
  join_date        date not null default current_date,
  commission_split numeric(5, 2) not null default 50
                   check (commission_split between 0 and 100),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they bypass RLS on profiles and can be
-- used inside policies without recursion)
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.app_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

-- True when the statement is not coming from a signed-in end user
-- (service_role key, SQL editor, migrations, cron jobs).
create or replace function public.is_system()
returns boolean
language sql
stable
set search_path = ''
as $$
  select (select auth.uid()) is null;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Auto-create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Agents may edit their own name/phone, but not role, commission or join date.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_system() or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.commission_split is distinct from old.commission_split
     or new.join_date is distinct from old.join_date
     or new.email is distinct from old.email then
    raise exception 'רק מנהל יכול לשנות תפקיד, אחוז עמלה, תאריך הצטרפות או אימייל'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Properties (נכסים)
-- -----------------------------------------------------------------------------
create table public.properties (
  id                   uuid primary key default gen_random_uuid(),
  city                 text not null,
  neighborhood         text,
  street               text,
  house_number         text,
  apartment_number     text,
  property_type        text,
  floor                integer,
  total_floors         integer,
  rooms                numeric(3, 1) check (rooms > 0),
  size_sqm             numeric(7, 2) check (size_sqm > 0),
  current_price        numeric(12, 0) check (current_price >= 0),
  previous_price       numeric(12, 0) check (previous_price >= 0),
  eviction_date        date,
  has_safe_room        boolean not null default false,  -- ממ"ד
  has_balcony          boolean not null default false,
  parking_spots        integer not null default 0 check (parking_spots >= 0),
  has_elevator         boolean not null default false,
  has_storage          boolean not null default false,
  is_renovated         boolean not null default false,
  status               public.property_status not null default 'active',
  recruiting_agent_id  uuid references public.profiles (id) on delete set null
                       default auth.uid(),
  is_exclusive         boolean not null default false,
  exclusivity_start    date,
  exclusivity_end      date,
  image_paths          text[] not null default '{}',  -- object paths in the property-media bucket
  virtual_tour_url     text,
  created_by           uuid references public.profiles (id) on delete set null
                       default auth.uid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (exclusivity_end is null or exclusivity_start is null or exclusivity_end >= exclusivity_start),
  check (floor is null or total_floors is null or floor <= total_floors)
);

-- Only the recruiting agent / admin may change ownership or exclusivity fields.
-- Also keeps previous_price in sync when the price changes.
create or replace function public.guard_property_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not (public.is_system() or public.is_admin()
          or old.recruiting_agent_id = (select auth.uid())) then
    if new.recruiting_agent_id is distinct from old.recruiting_agent_id
       or new.is_exclusive is distinct from old.is_exclusive
       or new.exclusivity_start is distinct from old.exclusivity_start
       or new.exclusivity_end is distinct from old.exclusivity_end then
      raise exception 'רק הסוכן המגייס או מנהל יכולים לשנות בלעדיות או סוכן מגייס'
        using errcode = '42501';
    end if;
  end if;

  if new.current_price is distinct from old.current_price then
    new.previous_price := old.current_price;
  end if;
  return new;
end;
$$;

create trigger properties_guard before update on public.properties
  for each row execute function public.guard_property_update();
create trigger properties_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

-- Owner details live in their own table so they can be hidden from other agents.
create table public.property_owner_details (
  property_id  uuid primary key references public.properties (id) on delete cascade,
  owner_name   text,
  owner_phone  text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger property_owner_details_updated_at before update on public.property_owner_details
  for each row execute function public.set_updated_at();

create or replace function public.can_manage_property(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.properties
    where id = p_property_id and recruiting_agent_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- Buyers (קונים)
-- -----------------------------------------------------------------------------
create table public.buyers (
  id                      uuid primary key default gen_random_uuid(),
  full_name               text not null,
  phone                   text,
  email                   text,
  max_budget              numeric(12, 0) check (max_budget >= 0),
  desired_city            text,
  preferred_neighborhoods text[] not null default '{}',
  min_rooms               numeric(3, 1) check (min_rooms > 0),
  property_type           text,
  status                  public.buyer_status not null default 'new',
  lead_source             text,
  owner_agent_id          uuid references public.profiles (id) on delete set null,
  claimed_at              timestamptz,
  notes                   text,
  created_by              uuid references public.profiles (id) on delete set null
                          default auth.uid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create or replace function public.track_buyer_claim()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_agent_id is distinct from old.owner_agent_id then
    new.claimed_at := case when new.owner_agent_id is null then null else now() end;
  end if;
  return new;
end;
$$;

create trigger buyers_claim before update on public.buyers
  for each row execute function public.track_buyer_claim();
create trigger buyers_updated_at before update on public.buyers
  for each row execute function public.set_updated_at();

-- Viewing history (Buyer <-> Property)
create table public.buyer_property_viewings (
  id           uuid primary key default gen_random_uuid(),
  buyer_id     uuid not null references public.buyers (id) on delete cascade,
  property_id  uuid not null references public.properties (id) on delete cascade,
  agent_id     uuid references public.profiles (id) on delete set null default auth.uid(),
  viewed_at    timestamptz not null default now(),
  feedback     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger viewings_updated_at before update on public.buyer_property_viewings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Tasks (Smart Task List)
-- -----------------------------------------------------------------------------
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  due_at       timestamptz,
  is_done      boolean not null default false,
  done_at      timestamptz,
  assigned_to  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  buyer_id     uuid references public.buyers (id) on delete set null,
  property_id  uuid references public.properties (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create or replace function public.track_task_done()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_done and not coalesce(old.is_done, false) then
    new.done_at := now();
  elsif not new.is_done then
    new.done_at := null;
  end if;
  return new;
end;
$$;

create trigger tasks_done before insert or update on public.tasks
  for each row execute function public.track_task_done();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Notifications (bell icon, Realtime)
-- -----------------------------------------------------------------------------
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  kind          text not null,
  title         text not null,
  body          text,
  link          text,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

alter publication supabase_realtime add table public.notifications;

-- -----------------------------------------------------------------------------
-- Financial transactions (admin only)
-- -----------------------------------------------------------------------------
create table public.financial_transactions (
  id            uuid primary key default gen_random_uuid(),
  occurred_on   date not null default current_date,
  type          public.transaction_type not null,
  amount        numeric(12, 2) not null check (amount > 0),
  category      text not null,  -- e.g. marketing, rent, agent_payout, office_supplies, commission
  agent_id      uuid references public.profiles (id) on delete set null,
  property_id   uuid references public.properties (id) on delete set null,
  buyer_id      uuid references public.buyers (id) on delete set null,
  notes         text,
  receipt_path  text,  -- object path in the invoices bucket
  created_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger financial_transactions_updated_at before update on public.financial_transactions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Candidates (admin only)
-- -----------------------------------------------------------------------------
create table public.candidates (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text not null,
  phone              text,
  email              text,
  source             text,
  status             public.candidate_status not null default 'new',
  cv_path            text,  -- object path in the candidate-cvs bucket
  interview_summary  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger candidates_updated_at before update on public.candidates
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index properties_recruiting_agent_idx on public.properties (recruiting_agent_id);
create index properties_status_idx on public.properties (status);
create index properties_city_rooms_price_idx on public.properties (city, rooms, current_price);
create index properties_city_trgm on public.properties using gin (city extensions.gin_trgm_ops);
create index properties_neighborhood_trgm on public.properties using gin (neighborhood extensions.gin_trgm_ops);
create index properties_street_trgm on public.properties using gin (street extensions.gin_trgm_ops);

create index buyers_owner_agent_idx on public.buyers (owner_agent_id);
create index buyers_status_idx on public.buyers (status);
create index buyers_full_name_trgm on public.buyers using gin (full_name extensions.gin_trgm_ops);
create index buyers_phone_trgm on public.buyers using gin (phone extensions.gin_trgm_ops);

create index viewings_buyer_idx on public.buyer_property_viewings (buyer_id);
create index viewings_property_idx on public.buyer_property_viewings (property_id);

create index tasks_assigned_open_idx on public.tasks (assigned_to, due_at) where not is_done;
create index tasks_buyer_idx on public.tasks (buyer_id);
create index tasks_property_idx on public.tasks (property_id);

create index notifications_recipient_idx on public.notifications (recipient_id, is_read, created_at desc);

create index financial_transactions_occurred_idx on public.financial_transactions (occurred_on desc);
create index candidates_status_idx on public.candidates (status);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles               enable row level security;
alter table public.properties             enable row level security;
alter table public.property_owner_details enable row level security;
alter table public.buyers                 enable row level security;
alter table public.buyer_property_viewings enable row level security;
alter table public.tasks                  enable row level security;
alter table public.notifications          enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.candidates             enable row level security;

-- profiles
create policy "profiles: read all" on public.profiles
  for select to authenticated using (true);
create policy "profiles: update self or admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: admin delete" on public.profiles
  for delete to authenticated using ((select public.is_admin()));

-- properties
create policy "properties: read all" on public.properties
  for select to authenticated using (true);
create policy "properties: insert as recruiter" on public.properties
  for insert to authenticated
  with check (recruiting_agent_id = (select auth.uid()) or (select public.is_admin()));
create policy "properties: update unless exclusive" on public.properties
  for update to authenticated
  using (not is_exclusive or recruiting_agent_id = (select auth.uid()) or (select public.is_admin()))
  with check (not is_exclusive or recruiting_agent_id = (select auth.uid()) or (select public.is_admin()));
create policy "properties: admin delete" on public.properties
  for delete to authenticated using ((select public.is_admin()));

-- property_owner_details
create policy "owner details: recruiter or admin read" on public.property_owner_details
  for select to authenticated using (public.can_manage_property(property_id));
create policy "owner details: recruiter or admin insert" on public.property_owner_details
  for insert to authenticated with check (public.can_manage_property(property_id));
create policy "owner details: recruiter or admin update" on public.property_owner_details
  for update to authenticated
  using (public.can_manage_property(property_id))
  with check (public.can_manage_property(property_id));
create policy "owner details: admin delete" on public.property_owner_details
  for delete to authenticated using ((select public.is_admin()));

-- buyers
create policy "buyers: read all" on public.buyers
  for select to authenticated using (true);
create policy "buyers: insert unclaimed or for self" on public.buyers
  for insert to authenticated
  with check (owner_agent_id is null or owner_agent_id = (select auth.uid()) or (select public.is_admin()));
create policy "buyers: update if unclaimed or owner" on public.buyers
  for update to authenticated
  using (owner_agent_id is null or owner_agent_id = (select auth.uid()) or (select public.is_admin()))
  with check (owner_agent_id is null or owner_agent_id = (select auth.uid()) or (select public.is_admin()));
create policy "buyers: admin delete" on public.buyers
  for delete to authenticated using ((select public.is_admin()));

-- buyer_property_viewings
create policy "viewings: read all" on public.buyer_property_viewings
  for select to authenticated using (true);
create policy "viewings: insert as self" on public.buyer_property_viewings
  for insert to authenticated
  with check (agent_id = (select auth.uid()) or (select public.is_admin()));
create policy "viewings: update own" on public.buyer_property_viewings
  for update to authenticated
  using (agent_id = (select auth.uid()) or (select public.is_admin()))
  with check (agent_id = (select auth.uid()) or (select public.is_admin()));
create policy "viewings: admin delete" on public.buyer_property_viewings
  for delete to authenticated using ((select public.is_admin()));

-- tasks
create policy "tasks: read all" on public.tasks
  for select to authenticated using (true);
create policy "tasks: insert as creator" on public.tasks
  for insert to authenticated
  with check (created_by = (select auth.uid()) or (select public.is_admin()));
create policy "tasks: update creator or assignee" on public.tasks
  for update to authenticated
  using (created_by = (select auth.uid()) or assigned_to = (select auth.uid()) or (select public.is_admin()))
  with check (created_by = (select auth.uid()) or assigned_to = (select auth.uid()) or (select public.is_admin()));
create policy "tasks: admin delete" on public.tasks
  for delete to authenticated using ((select public.is_admin()));

-- notifications (rows are created by the backend with the service_role key)
create policy "notifications: read own" on public.notifications
  for select to authenticated using (recipient_id = (select auth.uid()));
create policy "notifications: mark own read" on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));
create policy "notifications: admin delete" on public.notifications
  for delete to authenticated using ((select public.is_admin()));

-- financial_transactions & candidates: admin only
create policy "financial_transactions: admin only" on public.financial_transactions
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "candidates: admin only" on public.candidates
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- -----------------------------------------------------------------------------
-- Global search (SECURITY INVOKER: results respect the caller's RLS)
-- -----------------------------------------------------------------------------
create or replace function public.global_search(q text, max_results integer default 8)
returns table (entity text, id uuid, title text, subtitle text)
language sql
stable
security invoker
set search_path = ''
as $$
  with pat as (
    select '%' || replace(replace(replace(trim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as p
  )
  (select 'buyer', b.id, b.full_name, concat_ws(' · ', b.phone, b.desired_city)
     from public.buyers b, pat
    where b.full_name ilike pat.p or b.phone ilike pat.p or b.email ilike pat.p
    order by b.updated_at desc
    limit max_results)
  union all
  (select 'property', pr.id,
          concat_ws(' ', pr.street, pr.house_number),
          concat_ws(', ', pr.neighborhood, pr.city)
     from public.properties pr, pat
    where pr.city ilike pat.p or pr.neighborhood ilike pat.p or pr.street ilike pat.p
    order by pr.updated_at desc
    limit max_results)
  union all
  (select 'candidate', c.id, c.full_name, c.phone
     from public.candidates c, pat
    where c.full_name ilike pat.p or c.phone ilike pat.p or c.email ilike pat.p
    order by c.updated_at desc
    limit max_results);
$$;

-- -----------------------------------------------------------------------------
-- Storage buckets (all private; the frontend uses signed URLs)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('property-media', 'property-media', false),
  ('invoices', 'invoices', false),
  ('candidate-cvs', 'candidate-cvs', false)
on conflict (id) do nothing;

create policy "property-media: read" on storage.objects
  for select to authenticated using (bucket_id = 'property-media');
create policy "property-media: upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'property-media');
create policy "property-media: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'property-media' and (select public.is_admin()))
  with check (bucket_id = 'property-media' and (select public.is_admin()));
create policy "property-media: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'property-media' and (select public.is_admin()));

create policy "admin buckets: admin only" on storage.objects
  for all to authenticated
  using (bucket_id in ('invoices', 'candidate-cvs') and (select public.is_admin()))
  with check (bucket_id in ('invoices', 'candidate-cvs') and (select public.is_admin()));
