-- Hesabım: sınır doluyken ikinci cihaz girişi reddedilir (eski cihaz açık kalır).
-- device-limit-guard.sql'den sonra Supabase SQL Editor'de bir kez çalıştırın. Tekrar çalıştırmak zararsızdır.
-- Aktif cihaz: son 3 dakika içinde kalp atışı gönderen ve oturumu açık olan cihaz.
-- (Migration içeriği: device_limit_reject_second_login; yukarıdaki fonksiyonlar)

-- Ekip üyeleri: cihaz sınırı, kişinin kendi paketi ile üyesi olduğu işletmelerin sahiplerinin paketinden en yüksek olanıdır.
create or replace function public.device_plan_limit(uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select case coalesce((
    select max(case e.plan when 'premium' then 4 when 'proplus' then 3 when 'pro' then 2 else 1 end)
      from public.entitlements e
     where e.expires_at > now()
       and (
         e.user_id = uid
         or e.user_id in (
           select b.owner_id
             from public.business_members m
             join public.businesses b on b.id = m.business_id
            where m.user_id = uid
         )
       )
  ), 1)
    when 1 then 1 when 2 then 3 when 3 then 5 else null end
$$;
