-- Hesabım: ekip üyeleri listesi (onaylanmış katılmalar ve üyelikler). Ekip üyesi silince kaybolmaz.
-- Supabase SQL Editor'de bir kez çalıştırın (businesses-sharing.sql'den sonra).

create or replace function public.team_people()
returns table (user_id uuid, email text)
language sql security definer stable set search_path = public as $$
  select distinct u.id, u.email::text
  from auth.users u
  where exists (
      select 1 from public.join_requests r
      where r.requester_id = u.id and r.status = 'approved' and public.is_owner(r.business_id))
     or exists (
      select 1 from public.business_members m
      where m.user_id = u.id and m.role = 'member' and public.is_owner(m.business_id));
$$;

grant execute on function public.team_people() to authenticated;
