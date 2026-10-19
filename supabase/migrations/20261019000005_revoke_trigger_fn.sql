-- Trigger-only function: nobody should call it through the API.
revoke execute on function public.notify_bought_with_us() from public, anon, authenticated;
