-- =============================================================================
-- One look for every phone number: 052-123-4567 (mobile), 02-123-4567 (landline)
-- =============================================================================
-- Numbers are reformatted as they are saved (buyers, sellers, agents, candidates).
-- Anything that isn't a recognizable Israeli number is kept as typed.
-- Search compares digits only, so "0521234567" still finds "052-123-4567".
-- =============================================================================

create or replace function public.format_il_phone(p text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if trim(coalesce(p, '')) = '' then
    return null;
  end if;
  if d like '00972%' then
    d := '0' || substr(d, 6);
  elsif d like '972%' then
    d := '0' || substr(d, 4);
  end if;
  if length(d) = 10 and d like '0%' then      -- mobile / 07x: 052-123-4567
    return substr(d, 1, 3) || '-' || substr(d, 4, 3) || '-' || substr(d, 7);
  elsif length(d) = 9 and d like '0%' then    -- landline: 02-123-4567
    return substr(d, 1, 2) || '-' || substr(d, 3, 3) || '-' || substr(d, 6);
  end if;
  return trim(p);
end;
$$;

create or replace function public.normalize_phone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'property_owner_details' then
    new.owner_phone := public.format_il_phone(new.owner_phone);
  else
    new.phone := public.format_il_phone(new.phone);
  end if;
  return new;
end;
$$;

revoke execute on function public.normalize_phone() from public, anon, authenticated;

create trigger buyers_normalize_phone before insert or update of phone on public.buyers
  for each row execute function public.normalize_phone();
create trigger profiles_normalize_phone before insert or update of phone on public.profiles
  for each row execute function public.normalize_phone();
create trigger candidates_normalize_phone before insert or update of phone on public.candidates
  for each row execute function public.normalize_phone();
create trigger owner_details_normalize_phone before insert or update of owner_phone on public.property_owner_details
  for each row execute function public.normalize_phone();

-- Existing numbers (the triggers above do the formatting).
update public.buyers set phone = phone where phone is distinct from public.format_il_phone(phone);
update public.profiles set phone = phone where phone is distinct from public.format_il_phone(phone);
update public.candidates set phone = phone where phone is distinct from public.format_il_phone(phone);
update public.property_owner_details set owner_phone = owner_phone
  where owner_phone is distinct from public.format_il_phone(owner_phone);

-- Search: phone fields match on digits, ignoring dashes and spaces.
create or replace function public.global_search(q text, max_results integer default 8)
returns table (entity text, id uuid, title text, subtitle text)
language sql
stable
security invoker
set search_path = ''
as $$
  with pat as (
    select '%' || replace(replace(replace(trim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as p,
           -- Only searches with 3+ digits look at phone digits.
           case when length(regexp_replace(q, '\D', '', 'g')) >= 3
                then '%' || regexp_replace(q, '\D', '', 'g') || '%' end as d
  )
  (select 'buyer', b.id, b.full_name, concat_ws(' · ', b.phone, b.desired_city)
     from public.buyers b, pat
    where b.full_name ilike pat.p or b.email ilike pat.p
       or regexp_replace(coalesce(b.phone, ''), '\D', '', 'g') like pat.d
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
       or o.owner_name ilike pat.p
       or regexp_replace(coalesce(o.owner_phone, ''), '\D', '', 'g') like pat.d
    order by pr.updated_at desc
    limit max_results)
  union all
  (select 'candidate', c.id, c.full_name, c.phone
     from public.candidates c, pat
    where c.full_name ilike pat.p or c.email ilike pat.p
       or regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') like pat.d
    order by c.updated_at desc
    limit max_results);
$$;
