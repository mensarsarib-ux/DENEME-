-- Hesabım: bağlı cihazlar. Supabase SQL Editor'de bir kez çalıştırın (setup.sql'den sonra).
-- Her cihaz kendi kaydını yazar; kullanıcı yalnızca kendi hesabının cihazlarını görür.

create table if not exists public.user_devices (
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null,
  label text not null default '',
  last_seen timestamptz not null default now(),
  primary key (user_id, device_id)
);

alter table public.user_devices enable row level security;

drop policy if exists "kendi cihazlarini oku" on public.user_devices;
create policy "kendi cihazlarini oku" on public.user_devices
  for select using (auth.uid() = user_id);

drop policy if exists "kendi cihazini ekle" on public.user_devices;
create policy "kendi cihazini ekle" on public.user_devices
  for insert with check (auth.uid() = user_id);

drop policy if exists "kendi cihazini guncelle" on public.user_devices;
create policy "kendi cihazini guncelle" on public.user_devices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
