-- Paket sistemi son düzenlemeler (bir kez çalıştırılır, tekrar çalıştırmak zararsızdır)

-- 1) Aynı Apple aboneliği birden fazla Hesabım hesabına paket açmasın
alter table public.entitlements add column if not exists transaction_id text;
alter table public.entitlements add column if not exists original_transaction_id text;
create index if not exists entitlements_original_tx on public.entitlements (original_transaction_id);

-- 2) Ortak işletmede sınırlar işletme sahibinin paketine göre uygulanır.
--    Yalnızca o işletmenin sahibi ya da üyesi sorabilir; aksi hâlde sonuç boş döner.
create or replace function public.business_plan(bid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((
    select e.plan from public.entitlements e
    join public.businesses b on b.owner_id = e.user_id
    where b.id = bid and e.expires_at > now()
  ), 'free')
  where public.is_member(bid)
     or exists (select 1 from public.businesses b where b.id = bid and b.owner_id = auth.uid());
$$;
grant execute on function public.business_plan(uuid) to authenticated;
