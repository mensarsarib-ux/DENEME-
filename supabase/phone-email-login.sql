-- Hesabım: telefonla giriş, SMS'siz. Telefon numarası hesabın bilgilerinde (user_metadata.phone) tutulur;
-- giriş sırasında numara, hesabın e-postasına bu fonksiyonla çevrilir. Yalnızca sunucu (service_role) çağırabilir.
-- Supabase SQL Editor'de bir kez çalıştırın. Birden fazla kez çalıştırmak zarar vermez.

create or replace function public.email_for_phone(p text)
returns text
language sql security definer stable set search_path = public, auth as $$
  select u.email::text
  from auth.users u
  where u.raw_user_meta_data->>'phone' = p
    and u.email_confirmed_at is not null
  limit 1;
$$;

revoke execute on function public.email_for_phone(text) from public, anon, authenticated;
grant execute on function public.email_for_phone(text) to service_role;

-- Yetkiliyi telefonla bulma: telefon artık hesabın bilgilerinde (user_metadata.phone) tutuluyor
create or replace function public.find_business_by_owner_email(owner_email text)
returns table (id uuid, name text)
language sql security definer stable set search_path = public as $$
  select b.id, b.name
  from public.businesses b
  join auth.users u on u.id = b.owner_id
  where auth.uid() is not null
    and (
      (position('@' in owner_email) > 0 and lower(u.email) = lower(trim(owner_email)))
      or (position('@' in owner_email) = 0
          and u.raw_user_meta_data->>'phone' = regexp_replace(owner_email, '[^\d+]', '', 'g'))
    );
$$;
