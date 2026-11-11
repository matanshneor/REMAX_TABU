# Database (Supabase)

One database for all three products (CRM, website, ad tool): the tables, the permissions (RLS), file storage, the functions the website and the ad tool read through, the edge functions, and the Gmail script that feeds them. It stays one folder at the root because the tables are shared and the Supabase CLI looks for `supabase/` there.

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run **all** the files in `supabase/migrations/`, in order by file name. The easiest way:
   ```bash
   supabase link --project-ref <id>
   supabase db push
   ```
   (You can also paste them one by one into the SQL Editor, oldest first.)
3. Run `supabase/tests/rls_test.sql` in the SQL Editor. If it ends with `ALL RLS TESTS PASSED`, the permissions work. The test leaves no data behind.
4. Under **Authentication → Sign In / Providers**, turn on "Allow new users to sign up" and turn off "Confirm email". This lets agents sign up on their own; every new account waits for the admin's approval.
5. Make yourself the admin, from the SQL Editor:
   ```sql
   update public.profiles set role = 'admin', status = 'active' where email = 'your@email.com';
   ```

### Adding a new agent

1. The agent opens the site, clicks **הרשמה** (Sign up), and fills in name, phone, email and password.
2. The admin gets a notification in the bell and an email (see [Yad2 alerts and sign-up emails](#4-yad2-alerts-and-sign-up-emails)). On the **ניהול סוכנים** (Manage agents) screen, click **אישור** (Approve) or **דחייה** (Reject).
3. Until approval, the agent only sees an "account pending approval" screen, and the database returns no data to them. Once approved, the system opens up for them automatically.

An account created by hand in Supabase (**Authentication → Users → Add user**) also starts as pending, and is approved on the same screen.

Approve or block through the SQL Editor:
```sql
update public.profiles set status = 'active' where email = 'agent@example.com';   -- approve
update public.profiles set status = 'rejected' where email = 'agent@example.com'; -- block
```

To make a user an admin:
```sql
update public.profiles set role = 'admin' where email = 'agent@example.com';
```

### Changing a user's password

In the SQL Editor, replace the email and the password, then click Run:
```sql
update auth.users
set encrypted_password = extensions.crypt('the-new-password', extensions.gen_salt('bf')),
    updated_at = now()
where email = 'agent@example.com';
```
`UPDATE 1` means the password was changed. `UPDATE 0` means the email wasn't found.

### Deleting the sample data

All sample records have an id starting with `dddddddd`. To delete them, run in the SQL Editor:
```sql
delete from public.notifications where id::text like 'dddddddd%';
delete from public.financial_transactions where id::text like 'dddddddd%';
delete from public.tasks where id::text like 'dddddddd%';
delete from public.buyer_property_viewings where id::text like 'dddddddd%';
delete from public.buyers where id::text like 'dddddddd%';
delete from public.properties where id::text like 'dddddddd%';
delete from public.candidates where id::text like 'dddddddd%';
delete from auth.users where id::text like 'dddddddd%';   -- the sample agents
```

## Permission rules (enforced in the database)

- **Deleting:** admin only. An agent can only change a status, for example to "frozen" or "not relevant".
- **Exporting:** admin only, through `GET /export/{table}` on the server. Export can't be blocked in the database itself, because anyone who can see data can also copy it.
- **Sellers (properties):**
  - Each agent sees and edits only the sellers they recruited, including the seller's contact details. The admin sees all of them.
  - For matching buyers, every agent sees the office's offered properties (on the market, with an agreement) without the address or the seller, plus whose listing it is.
  - Only the admin sets or changes a seller's recruiting agent. Exclusivity can be changed only by the recruiting agent or the admin.
- **Buyers:** each agent sees and edits only their own buyers. The admin sees all of them, including unassigned leads, and is the only one who assigns a buyer to an agent or moves a buyer between agents. Viewing history is hidden the same way.
- **Duplicate buyer:** the phone check runs across the whole office. An agent only sees which agent handles the existing buyer, without the buyer's name or details.
- **Yad2 pool:** every approved user sees and works the whole pool. Only the admin deletes listings and imports from Yad2 Plus.
- **Deals:**
  - Only the admin records a closed deal: the agent, how much the office received, and the agent's percentage. The agent's default percentage fills in automatically.
  - Each deal automatically creates an income entry (the full commission) and an expense entry ("payment to agent") in the bookkeeping. Both update and get deleted together with the deal.
  - Each agent sees only their own deals under "העסקאות שלי" (My deals).
- **Tasks:** a personal list. Everyone, including the admin, sees only their own tasks, and you can't assign a task to someone else.
- **Finances and candidates:** admin only, including attached files (receipts and CVs).

## The Gmail script

`gmail-script/yad2-gmail-script.gs` runs in the office mailbox (`remaxtabu@gmail.com`) and does three jobs: sends Yad2 alerts to the CRM (`yad2-email-intake`), emails the manager about agents waiting for approval, and emails the manager about enquiries from the public website (`website-lead-emails`). Setup is in [crm/README.md](../crm/README.md#yad2-alerts-and-sign-up-emails).

## Tests

`tests/rls_test.sql` (permissions; needs updating, it predates the private-sellers rules) and `tests/website_test.sql` (what the anonymous key can read, photos, refresh calls). Both run in the SQL Editor and leave no data behind.
