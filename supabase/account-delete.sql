-- Hesabım: kullanıcı kendi hesabını siler (App Store zorunluluğu).
-- Hesap silinince kullanıcının verisi, cihazları, üyelikleri ve sahibi olduğu işletmeler (ve o işletmelerin verisi) kaskad olarak silinir.
-- Supabase SQL Editor'de bir kez çalıştırın.

create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'oturum yok';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_my_account() to authenticated;
