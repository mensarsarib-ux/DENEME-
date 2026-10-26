-- Hesabım: sahip, kendi oluşturduğu işletmeyi (kayıt döndürülürken) görebilsin.
-- Supabase SQL Editor'de bir kez çalıştırın.

drop policy if exists "sahip kendi isletmesini gorur" on public.businesses;
create policy "sahip kendi isletmesini gorur" on public.businesses
  for select using (owner_id = auth.uid());
