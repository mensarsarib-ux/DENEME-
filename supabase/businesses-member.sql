-- Hesabım: giriş yapan kişinin üyeliğini ve son katılma isteği durumunu okur.
-- Supabase SQL Editor'de bir kez çalıştırın (businesses-requests.sql'den sonra).

create or replace function public.my_membership()
returns table (business_id uuid, role text)
language sql security definer stable set search_path = public as $$
  select m.business_id, m.role
  from public.business_members m
  where m.user_id = auth.uid()
  order by (m.role = 'owner') desc
  limit 1;
$$;

create or replace function public.my_request_status()
returns text
language sql security definer stable set search_path = public as $$
  select r.status
  from public.join_requests r
  where r.requester_id = auth.uid()
  order by r.created_at desc
  limit 1;
$$;

grant execute on function public.my_membership() to authenticated;
grant execute on function public.my_request_status() to authenticated;
