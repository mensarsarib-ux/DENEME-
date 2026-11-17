-- Hesabım: telefon numarasının SMS koduyla (Firebase) doğrulanması.
-- Doğrulanan numara hesabın app_metadata.phone_verified alanına yazılır; bu alanı yalnızca sunucu değiştirebilir.
-- Kullanıcı numarasını değiştirirse (user_metadata.phone) iki alan farklı olur ve numara "doğrulanmadı" görünür.
-- Supabase SQL Editor'de bir kez çalıştırın. Birden fazla kez çalıştırmak zarar vermez.

-- Numarayı doğrulamış ve hâlâ kullanan hesap (yoksa boş)
create or replace function public.phone_owner(p text)
returns uuid
language sql security definer stable set search_path = public, auth as $$
  select u.id from auth.users u
  where u.raw_app_meta_data->>'phone_verified' = p and u.raw_user_meta_data->>'phone' = p limit 1;
$$;

-- Doğrulanan numarayı hesaba yazar. Numara başka bir hesapta doğrulanmışsa 'taken' döner.
-- Aynı numarayı doğrulamadan yazmış başka hesaplar varsa numara onlardan kaldırılır (sahibi kanıtlanan kişidir).
create or replace function public.attach_verified_phone(uid uuid, p text)
returns text
language plpgsql security definer set search_path = public, auth as $$
begin
  if exists (select 1 from auth.users u where u.id <> uid
             and u.raw_app_meta_data->>'phone_verified' = p and u.raw_user_meta_data->>'phone' = p) then
    return 'taken';
  end if;
  update auth.users
     set raw_user_meta_data = raw_user_meta_data - 'phone'
   where id <> uid and raw_user_meta_data->>'phone' = p;
  update auth.users
     set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('phone', p),
         raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('phone_verified', p)
   where id = uid;
  return 'ok';
end;
$$;

-- Telefonla giriş: numarayı doğrulamış hesap önce gelir
create or replace function public.email_for_phone(p text)
returns text
language sql security definer stable set search_path = public, auth as $$
  select u.email::text
  from auth.users u
  where u.raw_user_meta_data->>'phone' = p
    and u.email_confirmed_at is not null
  order by (u.raw_app_meta_data->>'phone_verified' = p) desc nulls last, u.email_confirmed_at
  limit 1;
$$;

revoke execute on function public.phone_owner(text) from public, anon, authenticated;
revoke execute on function public.attach_verified_phone(uuid, text) from public, anon, authenticated;
revoke execute on function public.email_for_phone(text) from public, anon, authenticated;
grant execute on function public.phone_owner(text) to service_role;
grant execute on function public.attach_verified_phone(uuid, text) to service_role;
grant execute on function public.email_for_phone(text) to service_role;
