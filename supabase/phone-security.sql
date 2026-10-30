-- Hesabım: telefonla giriş güvenliği.
-- 1) Aynı telefon numarası iki hesapta kullanılamaz (doğrulanmış başka bir hesapta varsa kayıt/güncelleme reddedilir).
-- 2) Telefonla girişte numara, ona ilk sahip olan doğrulanmış hesabın e-postasına çevrilir.
-- 3) Telefonla girişte hatalı denemeler kaydedilir; çok deneme yapan numara ya da adres bir süre bekletilir.
-- Supabase SQL Editor'de bir kez çalıştırın. Birden fazla kez çalıştırmak zarar vermez.

create or replace function public.check_phone_unique() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  p text := nullif(new.raw_user_meta_data->>'phone', '');
begin
  if p is null then return new; end if;
  -- Numara değişmediyse (ör. yalnızca ad güncellendi) kontrol edilmez
  if tg_op = 'UPDATE' and p is not distinct from nullif(old.raw_user_meta_data->>'phone', '') then return new; end if;
  if exists (
    select 1 from auth.users u
    where u.id <> new.id and u.raw_user_meta_data->>'phone' = p and u.email_confirmed_at is not null
  ) then
    raise exception 'telefon_kullanimda';
  end if;
  return new;
end;
$$;

drop trigger if exists phone_unique on auth.users;
create trigger phone_unique
  before insert or update of raw_user_meta_data on auth.users
  for each row execute function public.check_phone_unique();

create or replace function public.email_for_phone(p text)
returns text
language sql security definer stable set search_path = public, auth as $$
  select u.email::text
  from auth.users u
  where u.raw_user_meta_data->>'phone' = p
    and u.email_confirmed_at is not null
  order by u.email_confirmed_at
  limit 1;
$$;

revoke execute on function public.email_for_phone(text) from public, anon, authenticated;
grant execute on function public.email_for_phone(text) to service_role;

create table if not exists public.phone_login_attempts (
  id bigint generated always as identity primary key,
  phone text not null,
  ip text,
  at timestamptz not null default now()
);
alter table public.phone_login_attempts enable row level security;
revoke all on public.phone_login_attempts from anon, authenticated;
create index if not exists phone_login_attempts_phone on public.phone_login_attempts (phone, at);
create index if not exists phone_login_attempts_ip on public.phone_login_attempts (ip, at);
