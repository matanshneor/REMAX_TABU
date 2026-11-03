-- Emails sent in by the Gmail script in remaxtabu@gmail.com (Yad2 alerts), for the pool's intake.
-- Written only by the `yad2-email-intake` edge function (service role); the admin can read them.

create table public.inbound_emails (
  id uuid primary key default gen_random_uuid(),
  -- Gmail's message id: the same email sent twice is stored once.
  message_id text not null unique,
  sender text,
  subject text,
  sent_at timestamptz,
  html text,
  received_at timestamptz not null default now(),
  -- Set once its listings were read into the pool, with what was found.
  processed_at timestamptz,
  result jsonb
);

alter table public.inbound_emails enable row level security;

create policy "inbound emails: admin read" on public.inbound_emails
  for select to authenticated using (public.is_admin());

-- The script's key, stored as its SHA-256 (the key itself is only in the script).
create table public.intake_keys (
  name text primary key,
  key_sha256 text not null,
  created_at timestamptz not null default now()
);

alter table public.intake_keys enable row level security;
-- No policies: only the service role reads it.
