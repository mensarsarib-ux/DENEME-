-- 2026-11-02: Canlı veritabanında uygulanan sertleştirme (Supabase migration olarak da uygulandı).
-- Uygulamanın istemcisi bu fonksiyonları RPC ile çağırmaz; tetikleyici veya politika dışı iç fonksiyonlardır.
-- is_member / is_owner RLS politikalarında kullanıldığı için bilerek değiştirilmedi.

revoke execute on function public.add_owner_membership() from public, anon, authenticated;
revoke execute on function public.check_business_limit() from public, anon, authenticated;
revoke execute on function public.check_phone_unique() from public, anon, authenticated;
revoke execute on function public.keep_business_data_history() from public, anon, authenticated;
revoke execute on function public.notify_data_change() from public, anon, authenticated;
revoke execute on function public.notify_join_request() from public, anon, authenticated;
