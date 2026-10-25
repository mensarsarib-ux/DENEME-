-- Hesabım: bağlı cihazı listeden kaldırma izni. Supabase SQL Editor'de bir kez çalıştırın.
-- Kullanıcı yalnızca kendi hesabının cihaz kayıtlarını silebilir.

drop policy if exists "kendi cihazini sil" on public.user_devices;
create policy "kendi cihazini sil" on public.user_devices
  for delete using (auth.uid() = user_id);
