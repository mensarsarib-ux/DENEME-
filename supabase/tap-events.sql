-- Dokunma ısı haritası: anonim dokunma kayıtları
-- Yalnızca ekran adı, düğme adı, ekrandaki yüzde konumu ve rastgele oturum kimliği tutulur.
-- Kişisel veri (müşteri adı, tutar, e-posta, telefon) bu tabloya girmez.
-- Güvenle tekrar çalıştırılabilir (varsa atlanır).

create table if not exists public.tap_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text not null check (char_length(session_id) <= 64),
  screen text not null check (char_length(screen) <= 40),
  element text not null check (char_length(element) <= 60),
  x_pct real not null check (x_pct >= 0 and x_pct <= 100),
  y_pct real not null check (y_pct >= 0 and y_pct <= 100),
  viewport_w smallint check (viewport_w between 1 and 4000),
  app_version text check (char_length(app_version) <= 20)
);

create index if not exists tap_events_created_at_idx on public.tap_events (created_at);

-- Satır düzeyi güvenlik: anonim kullanıcı yalnızca yazabilir, okuyamaz
alter table public.tap_events enable row level security;

drop policy if exists "tap insert anon" on public.tap_events;
create policy "tap insert anon" on public.tap_events
  for insert to anon
  with check (true);

revoke select on public.tap_events from anon, authenticated;
