-- Hesabım: paket başına cihaz sınırı. Supabase SQL Editor'de bir kez çalıştırın (devices.sql ve plans-final.sql'den sonra).
-- Sınırlar: Ücretsiz 1, Pro 3, Pro Plus 5, Premium sınırsız (src/lib/plan.ts ile aynı).
-- Uygulama her dakika register_device çağırır. Sınırı aşan eski cihazların oturumu (auth.sessions) silinir;
-- o cihaz bir sonraki yenilemede çıkış yapar. Eski uygulama sürümleri (direkt tablo yazımı) etkilenmez.

alter table public.user_devices add column if not exists session_id uuid;

create or replace function public.register_device(p_device_id text, p_label text, p_session_id uuid)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  rnk int;
  lim int;
  old record;
  prev_sid uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_session_id is null then
    raise exception 'no_session';
  end if;

  -- Bu oturum artık geçerli değilse (cihaz sınır dışı kalıp oturumu silindi) cihaz yeniden kaydolmaz
  if not exists (select 1 from auth.sessions where id = p_session_id and user_id = uid) then
    return 'kicked';
  end if;

  -- Aynı cihazın eski oturumu varsa (çıkış yapılmadan yeniden girildi) onu kapat
  select session_id into prev_sid from public.user_devices where user_id = uid and device_id = p_device_id;
  if prev_sid is not null and prev_sid <> p_session_id then
    delete from auth.sessions where id = prev_sid;
  end if;

  insert into public.user_devices (user_id, device_id, label, last_seen, session_id)
  values (uid, p_device_id, left(coalesce(p_label, ''), 80), now(), p_session_id)
  on conflict (user_id, device_id)
  do update set label = excluded.label, last_seen = excluded.last_seen, session_id = excluded.session_id;

  -- Paket: en yüksek geçerli paket belirler (1 = Ücretsiz)
  select coalesce(max(case e.plan when 'premium' then 4 when 'proplus' then 3 when 'pro' then 2 else 1 end), 1)
    into rnk
    from public.entitlements e
   where e.user_id = uid and e.expires_at > now();
  lim := case rnk when 1 then 1 when 2 then 3 when 3 then 5 else null end;

  -- Sınırın üstündeki, en eski cihazlar (bu cihaz hariç) çıkarılır
  if lim is not null then
    for old in
      select device_id, session_id
        from public.user_devices
       where user_id = uid and device_id <> p_device_id
       order by last_seen desc
       offset lim - 1
    loop
      delete from public.user_devices where user_id = uid and device_id = old.device_id;
      if old.session_id is not null then
        delete from auth.sessions where id = old.session_id;
      end if;
    end loop;
  end if;

  return 'ok';
end;
$$;

revoke all on function public.register_device(text, text, uuid) from public, anon;
grant execute on function public.register_device(text, text, uuid) to authenticated;
