-- Sellers (property owners) are visible to every agent, on every property.
-- Editing seller details follows the property's own edit rule: anyone, unless the
-- property is exclusive — then only the recruiting agent and the admin.
-- Policies are altered in place (no drops).

alter policy "owner details: recruiter or admin read" on public.property_owner_details
  rename to "owner details: read all";
alter policy "owner details: read all" on public.property_owner_details
  using (true);

alter policy "owner details: recruiter or admin insert" on public.property_owner_details
  rename to "owner details: insert if property editable";
alter policy "owner details: insert if property editable" on public.property_owner_details
  with check (exists (
    select 1 from public.properties p
    where p.id = property_id
      and (not p.is_exclusive or p.recruiting_agent_id = (select auth.uid()) or (select public.is_admin()))
  ));

alter policy "owner details: recruiter or admin update" on public.property_owner_details
  rename to "owner details: update if property editable";
alter policy "owner details: update if property editable" on public.property_owner_details
  using (exists (
    select 1 from public.properties p
    where p.id = property_id
      and (not p.is_exclusive or p.recruiting_agent_id = (select auth.uid()) or (select public.is_admin()))
  ))
  with check (exists (
    select 1 from public.properties p
    where p.id = property_id
      and (not p.is_exclusive or p.recruiting_agent_id = (select auth.uid()) or (select public.is_admin()))
  ));

create index property_owner_details_name_trgm on public.property_owner_details
  using gin (owner_name extensions.gin_trgm_ops);
create index property_owner_details_phone_trgm on public.property_owner_details
  using gin (owner_phone extensions.gin_trgm_ops);

-- Global search also finds properties by the seller's name or phone.
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
          concat_ws(' · ', concat_ws(', ', pr.neighborhood, pr.city), o.owner_name)
     from public.properties pr
     cross join pat
     left join public.property_owner_details o on o.property_id = pr.id
    where pr.city ilike pat.p or pr.neighborhood ilike pat.p or pr.street ilike pat.p
       or o.owner_name ilike pat.p or o.owner_phone ilike pat.p
    order by pr.updated_at desc
    limit max_results)
  union all
  (select 'candidate', c.id, c.full_name, c.phone
     from public.candidates c, pat
    where c.full_name ilike pat.p or c.phone ilike pat.p or c.email ilike pat.p
    order by c.updated_at desc
    limit max_results);
$$;

revoke execute on function public.global_search(text, integer) from public, anon;
