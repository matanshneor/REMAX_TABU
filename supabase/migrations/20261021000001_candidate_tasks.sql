-- Interviews with recruiting candidates are tasks in the admin's own list, linked to the candidate.
alter table public.tasks
  add column candidate_id uuid references public.candidates (id) on delete set null;

create index tasks_candidate_idx on public.tasks (candidate_id);

-- Candidates are admin-only, so only an admin may link a task to one.
create policy "tasks: candidate link admin only" on public.tasks
  as restrictive for all to authenticated
  using (candidate_id is null or (select public.is_admin()))
  with check (candidate_id is null or (select public.is_admin()));
