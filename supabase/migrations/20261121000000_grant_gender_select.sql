-- profiles is readable column by column (commission_split stays private), so the new
-- gender column needs its own grant, or every profile read fails with 403 and the site never loads.
grant select (gender) on public.profiles to authenticated;
