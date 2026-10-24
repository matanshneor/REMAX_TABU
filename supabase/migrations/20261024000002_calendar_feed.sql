-- =============================================================================
-- Calendar subscription: each user's open tasks as a feed for their phone calendar
-- =============================================================================
-- A phone calendar fetches the feed without signing in, so the link carries a
-- personal secret token. The token lives in its own table (profiles are readable
-- by the whole office). Making a new token invalidates the old link.
-- =============================================================================

create table public.calendar_feeds (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  token       text not null unique,
  created_at  timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;

create policy "calendar feeds: read own" on public.calendar_feeds
  for select to authenticated using (user_id = (select auth.uid()));
create policy "approved only" on public.calendar_feeds
  as restrictive for all to authenticated
  using ((select public.is_active())) with check ((select public.is_active()));

-- Creates (or replaces) the signed-in user's feed token and returns it.
create or replace function public.rotate_calendar_token()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if (select auth.uid()) is null or not public.is_active() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.calendar_feeds (user_id, token) values ((select auth.uid()), v_token)
  on conflict (user_id) do update set token = excluded.token, created_at = now();
  return v_token;
end;
$$;

revoke execute on function public.rotate_calendar_token() from public, anon;

-- The feed itself: the token owner's open tasks with a due date (approved accounts only).
create or replace function public.calendar_feed(p_token text)
returns table (
  id uuid,
  title text,
  description text,
  due_at timestamptz,
  updated_at timestamptz,
  related text
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.title, t.description, t.due_at, t.updated_at,
         concat_ws(E'\n',
           case when b.id is not null then 'קונה: ' || b.full_name || coalesce(' (' || b.phone || ')', '') end,
           case when pr.id is not null then 'נכס: ' || concat_ws(', ', nullif(concat_ws(' ', pr.street, pr.house_number), ''), pr.city) end,
           case when c.id is not null then 'מועמד: ' || c.full_name || coalesce(' (' || c.phone || ')', '') end)
    from public.calendar_feeds f
    join public.profiles p on p.id = f.user_id and p.status = 'active'
    join public.tasks t on t.assigned_to = f.user_id
    left join public.buyers b on b.id = t.buyer_id
    left join public.properties pr on pr.id = t.property_id
    left join public.candidates c on c.id = t.candidate_id
   where length(p_token) >= 32
     and f.token = p_token
     and t.due_at is not null
     and not t.is_done
     and t.due_at > now() - interval '60 days'
   order by t.due_at;
$$;

revoke execute on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon, authenticated;
