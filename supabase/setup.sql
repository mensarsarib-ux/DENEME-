-- Hesabım: Supabase kurulumu. Supabase panelinde SQL Editor'e yapıştırıp bir kez çalıştırın.
-- Her kullanıcının tüm verisi tek satırda (JSON) tutulur; yalnızca sahibi okuyup yazabilir.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "kendi verisini oku" on public.user_data;
create policy "kendi verisini oku" on public.user_data
  for select using (auth.uid() = user_id);

drop policy if exists "kendi verisini ekle" on public.user_data;
create policy "kendi verisini ekle" on public.user_data
  for insert with check (auth.uid() = user_id);

drop policy if exists "kendi verisini guncelle" on public.user_data;
create policy "kendi verisini guncelle" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "kendi verisini sil" on public.user_data;
create policy "kendi verisini sil" on public.user_data
  for delete using (auth.uid() = user_id);
