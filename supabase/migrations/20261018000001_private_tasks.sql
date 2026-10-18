-- Tasks are a private to-do list: each user (admin included) sees and manages only
-- their own tasks, and nobody can assign a task to someone else.
-- Existing policies are altered in place (no drops).

alter policy "tasks: read all" on public.tasks rename to "tasks: read own";
alter policy "tasks: read own" on public.tasks
  using (assigned_to = (select auth.uid()));

alter policy "tasks: insert as creator" on public.tasks rename to "tasks: insert own";
alter policy "tasks: insert own" on public.tasks
  with check (assigned_to = (select auth.uid()) and created_by = (select auth.uid()));

alter policy "tasks: update creator or assignee" on public.tasks rename to "tasks: update own";
alter policy "tasks: update own" on public.tasks
  using (assigned_to = (select auth.uid()))
  with check (assigned_to = (select auth.uid()));

alter policy "tasks: admin delete" on public.tasks rename to "tasks: delete own";
alter policy "tasks: delete own" on public.tasks
  using (assigned_to = (select auth.uid()));
