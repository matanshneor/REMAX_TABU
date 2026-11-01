-- Where a seller came from (יד2, רימקס ישראל, הפניה... or anything typed in under "אחר"),
-- like buyers.lead_source.
alter table public.properties add column lead_source text;
