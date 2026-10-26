-- Hesabım: giriş yapan kişinin tüm işletmelerini (sahip ve üye olarak) listeler.
-- Supabase SQL Editor'de bir kez çalıştırın (businesses-team.sql'den sonra).

create or replace function public.my_businesses()
returns table (business_id uuid, role text, name text)
language sql security definer stable set search_path = public as $$
  select m.business_id, m.role, b.name
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  where m.user_id = auth.uid()
  order by b.created_at;
$$;

grant execute on function public.my_businesses() to authenticated;
