-- Hesabım: katılma isteklerini listeleme ve onaylama/reddetme.
-- Supabase SQL Editor'de bir kez çalıştırın (businesses.sql'den sonra).

-- Yetkilinin bekleyen katılma istekleri (kendi işletmeleri için)
create or replace function public.pending_requests()
returns table (request_id uuid, business_id uuid, business_name text, requester_email text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select r.id, r.business_id, b.name, u.email::text, r.created_at
  from public.join_requests r
  join public.businesses b on b.id = r.business_id
  join auth.users u on u.id = r.requester_id
  where r.status = 'pending' and public.is_owner(r.business_id)
  order by r.created_at desc;
$$;

-- İsteği onayla (üye olur) ya da reddet
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

grant execute on function public.pending_requests() to authenticated;
grant execute on function public.decide_join(uuid, boolean) to authenticated;
