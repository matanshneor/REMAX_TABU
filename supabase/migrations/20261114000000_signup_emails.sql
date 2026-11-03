-- Sign-up requests are also emailed to the admins, by the Gmail script in remaxtabu@gmail.com
-- (through the yad2-email-intake function). `emailed_at` marks the ones already sent.
alter table public.notifications add column emailed_at timestamptz;

-- Requests from before the email existed are not sent now.
update public.notifications set emailed_at = created_at where kind = 'signup_request';
