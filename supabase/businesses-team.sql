-- Hesabım: yetkilinin açtığı işletmeler ekip üyelerine de açılır; üye değişiklik bildirimleri içerikle yazar.
-- Supabase SQL Editor'de bir kez çalıştırın (businesses-member.sql ve businesses-notify.sql'den sonra).

-- 1) Yetkili yeni işletme açınca, mevcut ekip üyeleri de o işletmeye üye olur
create or replace function public.share_new_business() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.business_members (business_id, user_id, role)
  select distinct new.id, m.user_id, 'member'
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  where b.owner_id = new.owner_id and m.role = 'member'
  on conflict (business_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists businesses_share_new on public.businesses;
create trigger businesses_share_new
  after insert on public.businesses
  for each row execute function public.share_new_business();

-- 2) Katılma onaylanınca üye, yetkilinin TÜM işletmelerine eklenir
create or replace function public.decide_join(req uuid, approve boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.join_requests%rowtype;
  owner uuid;
begin
  select * into r from public.join_requests where id = req;
  if not found or not public.is_owner(r.business_id) then
    raise exception 'yetkisiz';
  end if;
  if approve then
    select owner_id into owner from public.businesses where id = r.business_id;
    insert into public.business_members (business_id, user_id, role)
    select b.id, r.requester_id, 'member'
    from public.businesses b
    where b.owner_id = owner
    on conflict (business_id, user_id) do nothing;
    update public.join_requests set status = 'approved' where id = req;
  else
    update public.join_requests set status = 'rejected' where id = req;
  end if;
  update public.business_notifications set read = true where request_id = req;
end;
$$;

-- 3) Üye değişiklik bildirimlerini kendisi (içerikle) yazar; eski genel tetikleyici kaldırılır
drop trigger if exists business_data_notify on public.business_data;

drop policy if exists "uyeler bildirim ekler" on public.business_notifications;
create policy "uyeler bildirim ekler" on public.business_notifications
  for insert with check (
    kind = 'data_change'
    and public.is_member(business_id)
    and auth.uid() <> (select b.owner_id from public.businesses b where b.id = business_id)
  );
