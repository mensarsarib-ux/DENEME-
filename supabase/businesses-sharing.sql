-- Hesabım: paylaşım artık yetkilinin kararı. Otomatik paylaşım kaldırılır.
-- Supabase SQL Editor'de bir kez çalıştırın (businesses-list.sql'den sonra).

-- 1) Yeni işletme açılınca ekip üyelerine otomatik paylaşım YOK
drop trigger if exists businesses_share_new on public.businesses;
drop function if exists public.share_new_business();

-- 2) Katılma onayı: üye yalnızca istediği işletmeye eklenir (diğerleri yetkilinin kararına bağlı)
create or replace function public.decide_join(req uuid, approve boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.join_requests%rowtype;
begin
  select * into r from public.join_requests where id = req;
  if not found or not public.is_owner(r.business_id) then
    raise exception 'yetkisiz';
  end if;
  if approve then
    insert into public.business_members (business_id, user_id, role)
    values (r.business_id, r.requester_id, 'member')
    on conflict (business_id, user_id) do nothing;
    update public.join_requests set status = 'approved' where id = req;
  else
    update public.join_requests set status = 'rejected' where id = req;
  end if;
  update public.business_notifications set read = true where request_id = req;
end;
$$;

-- 3) Ekip ekranı: yetkilinin sahip olduğu işletmelerdeki tüm üyeler
create or replace function public.team_overview()
returns table (business_id uuid, business_name text, user_id uuid, email text, role text)
language sql security definer stable set search_path = public as $$
  select m.business_id, b.name, m.user_id, u.email::text, m.role
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  join auth.users u on u.id = m.user_id
  where public.is_owner(m.business_id)
  order by b.created_at;
$$;

grant execute on function public.team_overview() to authenticated;
