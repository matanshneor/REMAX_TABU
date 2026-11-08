-- =============================================================================
-- Bell notification when new Yad2 pool listings fit someone's buyers
-- =============================================================================
-- Fires once per insert statement (a Yad2 Plus import brings many listings at once), so each
-- agent gets one notification listing their matching buyers, not one per listing. Unassigned
-- buyers go to the admins. Same hard requirements as matchBuyerToListing() in
-- frontend/src/lib/matching.ts: a pool listing has no balcony/elevator/safe-room data, so those
-- "must" features are not checked.
-- =============================================================================

create or replace function public.listing_fits_buyer(b public.buyers, l public.market_listings)
returns boolean
language sql
stable
set search_path = ''
as $$
  select l.status = 'new'
    and (cardinality(b.preferred_neighborhoods) = 0 or l.neighborhood = any (b.preferred_neighborhoods))
    -- Buyers may go up to 5% over their stated budget.
    and (b.max_budget is null or (l.price is not null and l.price <= b.max_budget * 1.05))
    and (b.min_rooms is null or (l.rooms is not null and l.rooms >= b.min_rooms))
    and ((b.floor_min is null and b.floor_max is null)
         or (l.floor is not null
             and (b.floor_min is null or l.floor >= b.floor_min)
             and (b.floor_max is null or l.floor <= b.floor_max)))
    and (nullif(b.property_type, '') is null or nullif(l.property_type, '') is null or b.property_type = l.property_type);
$$;

revoke execute on function public.listing_fits_buyer(public.buyers, public.market_listings) from public, anon;

create or replace function public.notify_listing_matches()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  with pairs as (
    -- Active buyers each new listing fits.
    select b.id as buyer_id, b.full_name, b.owner_agent_id, l.id as listing_id,
           concat_ws(', ', nullif(l.street, ''), l.neighborhood) as label
      from new_listings l
      join public.buyers b on b.status in ('new', 'hot', 'warm') and public.listing_fits_buyer(b, l)
  ),
  recipients as (
    select p.owner_agent_id as recipient_id, p.buyer_id, p.full_name, p.listing_id, p.label
      from pairs p
     where p.owner_agent_id is not null
    union all
    select a.id, p.buyer_id, p.full_name, p.listing_id, p.label
      from pairs p
      join public.profiles a on a.role = 'admin'
     where p.owner_agent_id is null
  ),
  grouped as (
    select r.recipient_id,
           count(distinct r.buyer_id) as buyers,
           count(distinct r.listing_id) as listings,
           min(r.listing_id::text) as one_listing,
           min(r.label) as one_label,
           (array_agg(distinct r.buyer_id::text))[1] as one_buyer,
           string_agg(distinct r.full_name, ', ') as names
      from recipients r
      join public.profiles p on p.id = r.recipient_id and p.status = 'active'
     group by r.recipient_id
  )
  insert into public.notifications (recipient_id, kind, title, body, link)
  select g.recipient_id,
         'listing_match',
         case when g.listings = 1 then 'מודעת יד 2 חדשה מתאימה ל' else 'מודעות יד 2 חדשות מתאימות ל' end
           || case when g.buyers = 1 then 'קונה שלך' else g.buyers || ' מהקונים שלך' end,
         case when g.listings = 1 and g.one_label <> '' then g.one_label || ' · ' || g.names
              when g.listings = 1 then g.names
              else g.listings || ' מודעות · ' || g.names end,
         case when g.listings = 1 then '/market?open=' || g.one_listing else '/market' end
    from grouped g;

  return null;
end;
$$;

revoke execute on function public.notify_listing_matches() from public, anon, authenticated;

create trigger market_listings_notify_matches
  after insert on public.market_listings
  referencing new table as new_listings
  for each statement execute function public.notify_listing_matches();
