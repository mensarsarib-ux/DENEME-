-- WhatsApp Business numarasına gelen mesajlar ve gönderdiğimiz mesajların durumları (wa-webhook yazar).
-- Yalnızca sunucu (service role) erişir: RLS açık, hiçbir politika yok.

create table if not exists public.wa_messages (
  id bigint generated always as identity primary key,
  wa_message_id text,
  direction text not null default 'in' check (direction in ('in', 'status')),
  wa_from text,
  profile_name text,
  type text,
  body text,
  status text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  raw jsonb
);

alter table public.wa_messages enable row level security;
revoke all on public.wa_messages from anon, authenticated;

-- Meta aynı mesajı birden fazla kez iletebilir: gelen mesaj bir kez yazılır
create unique index if not exists wa_messages_in_uniq on public.wa_messages (wa_message_id) where direction = 'in';
create index if not exists wa_messages_from_idx on public.wa_messages (wa_from, created_at desc);
