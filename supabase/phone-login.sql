-- Hesabım: telefonla giriş. Telefonla açılan hesapların e-postası yoktur; bu hesaplar ekip listelerinde
-- telefon numarasıyla görünür ve işletme sahibi telefon numarasıyla da bulunabilir.
-- Supabase SQL Editor'de bir kez çalıştırın (security-fixes.sql'den sonra). Birden fazla kez çalıştırmak zarar vermez.
-- auth.users.phone numarayı başında + olmadan saklar (ör. 905551112233).

-- 1) İşletme arama: yetkilinin e-postası ya da telefonu (yalnızca giriş yapmış kullanıcılar)
create or replace function public.find_business_by_owner_email(owner_email text)
returns table (id uuid, name text)
language sql security definer stable set search_path = public as $$
  select b.id, b.name
  from public.businesses b
  join auth.users u on u.id = b.owner_id
  where auth.uid() is not null
    and (
      (position('@' in owner_email) > 0 and lower(u.email) = lower(trim(owner_email)))
      or (position('@' in owner_email) = 0
          and length(regexp_replace(owner_email, '\D', '', 'g')) >= 10
          and u.phone = regexp_replace(owner_email, '\D', '', 'g'))
    );
$$;

-- 2) Ekip üyeleri listesi: e-postası olmayan üye telefon numarasıyla görünür
create or replace function public.team_people()
returns table (user_id uuid, email text)
language sql security definer stable set search_path = public as $$
  select distinct u.id, coalesce(u.email::text, '+' || u.phone::text)
  from auth.users u
  where exists (
      select 1 from public.join_requests r
      where r.requester_id = u.id and r.status = 'approved' and public.is_owner(r.business_id))
     or exists (
      select 1 from public.business_members m
      where m.user_id = u.id and m.role = 'member' and public.is_owner(m.business_id));
$$;

-- 3) Bekleyen katılma istekleri: isteyen kişi e-postası ya da telefonuyla görünür
create or replace function public.pending_requests()
returns table (request_id uuid, business_id uuid, business_name text, requester_email text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select r.id, r.business_id, b.name, coalesce(u.email::text, '+' || u.phone::text), r.created_at
  from public.join_requests r
  join public.businesses b on b.id = r.business_id
  join auth.users u on u.id = r.requester_id
  where r.status = 'pending' and public.is_owner(r.business_id)
  order by r.created_at desc;
$$;

-- 4) Ekip ekranı: yetkilinin işletmelerindeki üyeler
create or replace function public.team_overview()
returns table (business_id uuid, business_name text, user_id uuid, email text, role text)
language sql security definer stable set search_path = public as $$
  select m.business_id, b.name, m.user_id, coalesce(u.email::text, '+' || u.phone::text), m.role
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  join auth.users u on u.id = m.user_id
  where public.is_owner(m.business_id)
  order by b.created_at;
$$;

-- Yetkiler: yalnızca giriş yapmış kullanıcılar
revoke execute on function public.find_business_by_owner_email(text) from public, anon;
revoke execute on function public.team_people() from public, anon;
revoke execute on function public.pending_requests() from public, anon;
revoke execute on function public.team_overview() from public, anon;
grant execute on function public.find_business_by_owner_email(text) to authenticated;
grant execute on function public.team_people() to authenticated;
grant execute on function public.pending_requests() to authenticated;
grant execute on function public.team_overview() to authenticated;
