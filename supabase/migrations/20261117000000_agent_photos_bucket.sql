-- Agent portraits for the ad tool. The bucket is public (the ad tool is open without signing in
-- and the photos are printed on every ad); only the admin adds, replaces or removes them.
insert into storage.buckets (id, name, public)
values ('agent-photos', 'agent-photos', true)
on conflict (id) do nothing;

create policy "agent-photos: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'agent-photos' and (select public.is_admin()));
create policy "agent-photos: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'agent-photos' and (select public.is_admin()))
  with check (bucket_id = 'agent-photos' and (select public.is_admin()));
create policy "agent-photos: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'agent-photos' and (select public.is_admin()));
