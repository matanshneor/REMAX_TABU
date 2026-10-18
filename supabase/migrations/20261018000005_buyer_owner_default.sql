-- A buyer belongs to whoever entered it (there is no "handling agent" field in the UI).
alter table public.buyers alter column owner_agent_id set default auth.uid();
