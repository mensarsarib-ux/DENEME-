-- Hesabım: üye değişikliklerinde sahibe bildirim (10 dakikada en fazla bir kez).
-- Supabase SQL Editor'de bir kez çalıştırın (businesses.sql'den sonra).

create or replace function public.notify_data_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  owner uuid;
begin
  select owner_id into owner from public.businesses where id = new.business_id;
  if auth.uid() is not null and auth.uid() <> owner
     and not exists (
       select 1 from public.business_notifications n
       where n.business_id = new.business_id
         and n.kind = 'data_change'
         and n.read = false
         and n.created_at > now() - interval '10 minutes'
     ) then
    insert into public.business_notifications (business_id, kind, message)
    values (new.business_id, 'data_change', 'Üye işletmede bir değişiklik yaptı (ekleme, düzenleme veya silme).');
  end if;
  return new;
end;
$$;
