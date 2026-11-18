-- Hesabım: e-posta doğrulaması isteğe bağlı ("Confirm email" kapalı).
-- Supabase bu ayar kapalıyken yeni hesabı kayıt anında onaylı sayar. Gerçekte doğrulanmadığını göstermek için
-- yeni hesaplara app_metadata.email_unverified = true yazılır; kullanıcı menüden kodla doğrulayınca kaldırılır
-- (functions/email-verified). Eski (gerçekten onaylı) hesaplarda bu işaret yoktur, "Doğrulandı" görünür.
-- Supabase SQL Editor'de bir kez çalıştırın. Birden fazla kez çalıştırmak zarar vermez.

create or replace function public.flag_unverified_email() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if new.email is not null and new.email_confirmed_at is not null then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('email_unverified', true);
  end if;
  return new;
end;
$$;

revoke execute on function public.flag_unverified_email() from public, anon, authenticated;

drop trigger if exists flag_unverified_email on auth.users;
create trigger flag_unverified_email before insert on auth.users
  for each row execute function public.flag_unverified_email();
