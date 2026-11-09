-- The office manager is the franchisee, not an agent: his title on ads is זכיין (זכיינית), whatever the gender field says.
create or replace function public.ad_tool_agents()
returns table (name text, role text, license text, phone text, photo_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.full_name,
         case
           when p.role = 'admin' then case o.gender when 'female' then 'זכיינית' else 'זכיין' end
           else case o.gender when 'female' then 'סוכנת נדל"ן' when 'male' then 'סוכן נדל"ן' else o.role end
         end,
         o.license, o.phone, o.photo_url
    from public.office_agents o
    left join public.profiles p on p.id = o.profile_id
   order by (p.role = 'admin') desc nulls last, o.full_name;
$$;
