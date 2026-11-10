-- Güvenlik düzeltmeleri (10 Kasım 2026 denetimi). HENÜZ CANLIYA UYGULANMADI; onay bekliyor.
-- Mevcut uygulama sürümlerinin (iOS 38, Android 49) kullandığı çağrılar aynen çalışmaya devam eder.

-- 1) İşletmenin sahibi değiştirilemez. Açık: sahip, owner_id alanını Premium bir kullanıcıya çevirip
--    işletmesini o kullanıcının paketiyle kullanabiliyor, kurbanın işletme sınırını da doldurabiliyordu.
create or replace function public.lock_business_owner() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and (new.owner_id is distinct from old.owner_id or new.id is distinct from old.id) then
    raise exception 'sahip_degistirilemez';
  end if;
  return new;
end $$;
revoke execute on function public.lock_business_owner() from public, anon, authenticated;
drop trigger if exists businesses_owner_locked on public.businesses;
create trigger businesses_owner_locked before update on public.businesses
  for each row execute function public.lock_business_owner();

-- 2) Sahip, yalnızca ekibindeki kişiye (onaylanmış katılma isteği ya da başka işletmesinde üyeliği olan)
--    işletme paylaşabilir. Açık: sahip herhangi bir kullanıcıyı izni olmadan üye yapabiliyor, ekip sınırını aşabiliyordu.
create or replace function public.can_share_with(bid uuid, uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses b where b.id = bid and b.owner_id = auth.uid())
     and uid <> auth.uid()
     and (
       exists (select 1 from public.join_requests r join public.businesses b2 on b2.id = r.business_id
               where r.requester_id = uid and r.status = 'approved' and b2.owner_id = auth.uid())
       or exists (select 1 from public.business_members m join public.businesses b2 on b2.id = m.business_id
                  where m.user_id = uid and m.role = 'member' and b2.owner_id = auth.uid())
     );
$$;
revoke execute on function public.can_share_with(uuid, uuid) from public, anon;
grant execute on function public.can_share_with(uuid, uuid) to authenticated;
drop policy if exists "sahip uye ekler" on public.business_members;
create policy "sahip uye ekler" on public.business_members for insert
  with check (role = 'member' and public.can_share_with(business_id, user_id));

-- 3) Sahip bir isteği doğrudan "onaylandı" yapamaz (onay yalnızca decide_join ile, ekip sınırı kontrolüyle olur);
--    doğrudan güncelleme yalnızca reddetmek / ekipten çıkarmak içindir.
drop policy if exists "sahip istegi onaylar" on public.join_requests;
create policy "sahip istegi onaylar" on public.join_requests for update
  using (public.is_owner(business_id))
  with check (public.is_owner(business_id) and status = 'rejected');

-- 4) Katılma isteği yağmuru: aynı işletmeye bekleyen istek varken yenisi sessizce yok sayılır,
--    bir kişi saatte en fazla 10 istek gönderebilir. (Her istek sahibe bildirim üretiyordu.)
create or replace function public.limit_join_requests() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if exists (select 1 from public.join_requests r
             where r.business_id = new.business_id and r.requester_id = new.requester_id and r.status = 'pending') then
    return null;
  end if;
  if (select count(*) from public.join_requests r
      where r.requester_id = new.requester_id and r.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'cok_fazla_istek';
  end if;
  return new;
end $$;
revoke execute on function public.limit_join_requests() from public, anon, authenticated;
drop trigger if exists join_requests_limit on public.join_requests;
create trigger join_requests_limit before insert on public.join_requests
  for each row execute function public.limit_join_requests();

-- 5) Gereksiz yetkiler: giriş yapmamış (anon) rolün tablolara hiçbir erişimi olmasın;
--    giriş yapmış rolde kullanılmayan TRUNCATE / REFERENCES / TRIGGER yetkileri kalksın.
revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke execute on function public.is_member(uuid) from anon;
revoke execute on function public.is_owner(uuid) from anon;
