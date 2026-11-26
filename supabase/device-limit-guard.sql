-- Hesabım: cihaz sınırı, eski uygulama sürümleri dahil. device-limit.sql'den sonra Supabase SQL Editor'de bir kez çalıştırın.
-- user_devices'a yazan her heartbeat'te (eski ve yeni sürümler) sınır uygulanır; oturum kimliği JWT'den alınır.
-- Sonunda, paket sınırını aşan mevcut oturumlar son yenilenme sırasına göre kapatılır.

create or replace function public.device_plan_limit(uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select case coalesce((
    select max(case e.plan when 'premium' then 4 when 'proplus' then 3 when 'pro' then 2 else 1 end)
      from public.entitlements e
     where e.user_id = uid and e.expires_at > now()
  ), 1)
    when 1 then 1 when 2 then 3 when 3 then 5 else null end
$$;

create or replace function public.user_devices_guard() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  sid uuid;
  lim int;
  old record;
begin
  begin
    sid := ((nullif(current_setting('request.jwt.claims', true), ''))::json ->> 'session_id')::uuid;
  exception when others then
    sid := null;
  end;

  if sid is not null then
    -- Oturum silinmişse (cihaz sınır dışı kaldıysa) cihaz yeniden kaydolamaz
    if not exists (select 1 from auth.sessions where id = sid and user_id = new.user_id) then
      raise exception 'device_session_ended';
    end if;
    new.session_id := sid;
  end if;

  lim := public.device_plan_limit(new.user_id);
  if lim is not null then
    for old in
      select device_id, session_id
        from public.user_devices
       where user_id = new.user_id
         and device_id <> new.device_id
         and (session_id is distinct from sid)
       order by last_seen desc
       offset lim - 1
    loop
      delete from public.user_devices where user_id = new.user_id and device_id = old.device_id;
      if old.session_id is not null then
        delete from auth.sessions where id = old.session_id;
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists user_devices_guard on public.user_devices;
create trigger user_devices_guard
  before insert or update on public.user_devices
  for each row execute function public.user_devices_guard();

-- Mevcut durum: her kullanıcının paket sınırının üstündeki eski oturumları (son yenilenmeye göre) kapatılır
with ranked as (
  select s.id, s.user_id,
         row_number() over (partition by s.user_id order by coalesce(s.refreshed_at, s.updated_at, s.created_at) desc) as rn
    from auth.sessions s
)
delete from auth.sessions s
 using ranked r
 where s.id = r.id
   and public.device_plan_limit(r.user_id) is not null
   and r.rn > public.device_plan_limit(r.user_id);

delete from public.user_devices d
 where d.session_id is not null
   and not exists (select 1 from auth.sessions s where s.id = d.session_id);
