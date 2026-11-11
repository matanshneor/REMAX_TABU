-- =============================================================================
-- Each agent writes their own few words for the public website
-- =============================================================================
-- The team list (office_agents) is edited only by the manager. The manager asked (11.11.2026)
-- that every agent fill in the few words shown about them on the site ("המשרד שלנו") themselves.
-- This function lets a signed-in agent change that one field, on their own row only.
-- Nothing else in the team list opens up, and no existing data changes.
-- =============================================================================

create or replace function public.set_my_website_bio(p_bio text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bio text := nullif(trim(coalesce(p_bio, '')), '');
begin
  if not public.is_active() then
    raise exception 'אין הרשאה' using errcode = '42501';
  end if;
  if length(v_bio) > 600 then
    raise exception 'הטקסט ארוך מדי (עד 600 תווים)' using errcode = '23514';
  end if;
  update public.office_agents set website_bio = v_bio where profile_id = (select auth.uid());
  if not found then
    raise exception 'לא נמצאה השורה שלך ברשימת הצוות. פנו למנהל המשרד.' using errcode = 'P0002';
  end if;
  return v_bio;
end;
$$;

revoke execute on function public.set_my_website_bio(text) from public, anon;
grant execute on function public.set_my_website_bio(text) to authenticated;
