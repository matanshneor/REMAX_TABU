-- =============================================================================
-- One agent list for the CRM and the ad tool
-- =============================================================================
-- The ad tool (served from the CRM site at /ad-tool) used to keep its own agents file. It now
-- reads the office team list, so adding or removing an agent there changes the ad tool too.
-- The ad tool is open without signing in, so it gets the list through ad_tool_agents(), which
-- returns only what is already printed on every ad: name, role, license, phone and photo.
-- =============================================================================

alter table public.office_agents
  add column role      text,   -- as printed on the ad, e.g. סוכנת נדל"ן (gendered, so typed in)
  add column license   text,   -- broker license number
  add column photo_url text;   -- cut-out portrait: a path on the site or a public storage URL

create or replace function public.ad_tool_agents()
returns table (name text, role text, license text, phone text, photo_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.full_name, o.role, o.license, o.phone, o.photo_url
    from public.office_agents o
    left join public.profiles p on p.id = o.profile_id
   order by (p.role = 'admin') desc nulls last, o.full_name;
$$;

revoke execute on function public.ad_tool_agents() from public;
grant execute on function public.ad_tool_agents() to anon, authenticated;

-- The agents the ad tool already had (matched by phone).
update public.office_agents o
   set role = v.role, license = v.license, photo_url = v.photo
  from (values
    ('052-8110611', 'זכיין',          '3181402',   '/ad-tool/images/Moshe_Shneor_image.webp'),
    ('053-3453961', 'סוכנת נדל"ן',   '312109174', '/ad-tool/images/Limor_Marco_image.webp'),
    ('054-8366822', 'סוכנת נדל"ן',   '31034580',  '/ad-tool/images/Miriam_Shpangental_image.webp'),
    ('050-7690054', 'סוכנת נדל"ן',   '3166785',   '/ad-tool/images/Hadas_Aharon_image.webp'),
    ('052-8249515', 'סוכנת נדל"ן',   '311106208', '/ad-tool/images/Yehudit_Zaken_image.webp'),
    ('050-4443830', 'סוכנת נדל"ן',   '3151288',   '/ad-tool/images/Efrat_Levi_image.webp'),
    ('050-6999596', 'סוכן נדל"ן',    '31927075',  '/ad-tool/images/Meir_Maor_Akrish_image.webp'),
    ('058-7551878', 'סוכן נדל"ן',    '3204910',   '/ad-tool/images/Avraham_Katri_image.webp'),
    ('055-6697474', 'סוכנת נדל"ן',   '31929675',  '/ad-tool/images/Rachel_Malka_image.webp')
  ) as v(phone, role, license, photo)
 where public.phone_key(o.phone) = public.phone_key(v.phone);
