-- =============================================================================
-- "המודעות שלי": every ad made in the ad tool is kept
-- =============================================================================
-- When a signed-in user makes an ad, the tool saves the picture, the form and the photos it
-- used. The ad belongs to the agent who appears on it (found by phone among the office's
-- accounts); if that agent has no account, it stays with whoever made it. The maker, the agent
-- on the ad and the manager can see it, download it, open it again and delete it.
--
-- Files live in the private bucket saved-ads, under the ad's id:
--   <id>/ad.png, <id>/photo-1.jpg, <id>/photo-2.jpg ...
-- The tool adds the row first and uploads after, so the files can always be checked
-- against a row the user can see.
-- =============================================================================

create table if not exists public.saved_ads (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  created_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  agent_profile_id uuid references public.profiles (id) on delete set null,
  agent_name       text,
  agent_phone      text,
  title            text not null,
  price            text,
  design           text,
  form             jsonb not null default '{}'::jsonb,
  photo_count      smallint not null default 0 check (photo_count between 0 and 10),
  property_id      uuid references public.properties (id) on delete set null
);

comment on table public.saved_ads is 'Ads made in the ad tool (המודעות שלי). Files in bucket saved-ads under <id>/.';

create index if not exists saved_ads_agent_idx on public.saved_ads (agent_profile_id, created_at desc);
create index if not exists saved_ads_creator_idx on public.saved_ads (created_by, created_at desc);

-- The owner is worked out here, not sent by the tool: the agent on the ad by phone, else the maker.
create or replace function public.set_saved_ad_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_by := (select auth.uid());
  new.agent_profile_id := coalesce(
    (select o.profile_id
       from public.office_agents o
       join public.profiles p on p.id = o.profile_id and p.status = 'active'
      where nullif(new.agent_phone, '') is not null
        and public.phone_key(o.phone) = public.phone_key(new.agent_phone)
      limit 1),
    new.created_by);
  return new;
end;
$$;

revoke execute on function public.set_saved_ad_owner() from public, anon, authenticated;

create or replace trigger set_saved_ad_owner
  before insert on public.saved_ads
  for each row execute function public.set_saved_ad_owner();

alter table public.saved_ads enable row level security;

create policy "saved ads: read own or admin" on public.saved_ads
  for select to authenticated
  using (agent_profile_id = (select auth.uid()) or created_by = (select auth.uid()) or (select public.is_admin()));
create policy "saved ads: insert own" on public.saved_ads
  for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "saved ads: delete own or admin" on public.saved_ads
  for delete to authenticated
  using (agent_profile_id = (select auth.uid()) or created_by = (select auth.uid()) or (select public.is_admin()));
create policy "approved only" on public.saved_ads
  as restrictive for all to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));

grant select, insert, delete on public.saved_ads to authenticated;

-- -----------------------------------------------------------------------------
-- Files
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('saved-ads', 'saved-ads', false)
on conflict (id) do nothing;

-- Read and delete: files of ads you can see (the subquery is itself limited by the policies above).
create policy "saved-ads: read with ad" on storage.objects
  for select to authenticated
  using (bucket_id = 'saved-ads'
         and exists (select 1 from public.saved_ads a where a.id::text = (storage.foldername(name))[1]));
create policy "saved-ads: delete with ad" on storage.objects
  for delete to authenticated
  using (bucket_id = 'saved-ads'
         and exists (select 1 from public.saved_ads a where a.id::text = (storage.foldername(name))[1]));
-- Upload: only into the folder of an ad you made yourself. No overwriting (no update policy).
create policy "saved-ads: upload to own ad" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'saved-ads'
              and exists (select 1 from public.saved_ads a
                           where a.id::text = (storage.foldername(name))[1]
                             and a.created_by = (select auth.uid())));
