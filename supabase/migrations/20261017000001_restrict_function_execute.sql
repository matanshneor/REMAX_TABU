-- Helper functions are not part of the public API.
-- Signed-in users still need EXECUTE on the ones RLS policies call
-- (they only reveal the caller's own role/permissions).
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.app_role() from public, anon;
revoke execute on function public.can_manage_property(uuid) from public, anon;
revoke execute on function public.is_system() from public, anon;
revoke execute on function public.global_search(text, integer) from public, anon;

-- Trigger-only function: nobody should call it through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
