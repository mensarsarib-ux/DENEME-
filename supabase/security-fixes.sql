-- Hesabım: güvenlik denetimi düzeltmeleri. Supabase SQL Editor'de bir kez çalıştırın
-- (diğer tüm .sql dosyalarından ve team-limit.sql'den sonra). Birden fazla kez çalıştırmak zarar vermez.

-- 1) İşletme arama yalnızca giriş yapmış kullanıcılara açık.
--    Supabase'de fonksiyonlar varsayılan olarak giriş yapmamış (anon) isteklere de açıktır; bu fonksiyon
--    girişsiz çağrılınca herhangi bir e-postanın uygulamada işletmesi olup olmadığını ve işletme adını gösteriyordu.
create or replace function public.find_business_by_owner_email(owner_email text)
returns table (id uuid, name text)
language sql security definer stable set search_path = public as $$
  select b.id, b.name
  from public.businesses b
  join auth.users u on u.id = b.owner_id
  where auth.uid() is not null
    and lower(u.email) = lower(trim(owner_email));
$$;

-- Girişsiz (anon) çağrılar kapatılır; giriş yapmış kullanıcılar kullanmaya devam eder
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.find_business_by_owner_email(text)',
    'public.decide_join(uuid, boolean)',
    'public.pending_requests()',
    'public.team_people()',
    'public.team_overview()',
    'public.my_businesses()',
    'public.my_membership()',
    'public.my_request_status()',
    'public.delete_my_account()',
    'public.business_plan(uuid)'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon', f);
      execute format('grant execute on function %s to authenticated', f);
    end if;
  end loop;
end $$;

-- 2) Katılma isteği yalnızca "bekliyor" durumunda oluşturulabilir (kendi isteğini "onaylandı" yazamaz)
drop policy if exists "kisi istek gonderir" on public.join_requests;
create policy "kisi istek gonderir" on public.join_requests
  for insert with check (
    requester_id = auth.uid()
    and status = 'pending'
    and not public.is_member(business_id)
  );

-- 3) Veri boyutu sınırı: tek bir hesabın veritabanını şişirmesi (maliyet ve hizmet kesintisi) önlenir.
--    5 MB, on binlerce işlem kaydına yeter. Mevcut satırlar kontrol edilmez (not valid).
alter table public.business_data drop constraint if exists business_data_size;
alter table public.business_data add constraint business_data_size
  check (octet_length(data::text) < 5 * 1024 * 1024) not valid;
alter table public.user_data drop constraint if exists user_data_size;
alter table public.user_data add constraint user_data_size
  check (octet_length(data::text) < 5 * 1024 * 1024) not valid;
alter table public.business_notifications drop constraint if exists business_notifications_size;
alter table public.business_notifications add constraint business_notifications_size
  check (char_length(message) < 4000) not valid;

-- 4) İşletme sayısı sınırı sunucuda da denetlenir (uygulamadaki ile aynı: Ücretsiz 1, Pro 3, Pro Plus 6, Premium sınırsız)
create or replace function public.check_business_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  owner_plan text;
  max_businesses int;
  current_count int;
begin
  select coalesce((select e.plan from public.entitlements e
                   where e.user_id = new.owner_id and e.expires_at > now()), 'free')
    into owner_plan;
  max_businesses := case owner_plan when 'pro' then 3 when 'proplus' then 6 when 'premium' then null else 1 end;
  if max_businesses is not null then
    select count(*) into current_count from public.businesses where owner_id = new.owner_id;
    if current_count >= max_businesses then
      raise exception 'isletme_siniri';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_limit on public.businesses;
create trigger businesses_limit
  before insert on public.businesses
  for each row execute function public.check_business_limit();

-- 5) Ortak işletme verisinin geçmişi: her değişiklikten önceki hâl saklanır (son 30 sürüm).
--    Bir üye yanlışlıkla ya da kötü niyetle verileri silerse yetkili eski hâle dönebilir.
create table if not exists public.business_data_history (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  data jsonb not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index if not exists business_data_history_biz on public.business_data_history (business_id, changed_at desc);
alter table public.business_data_history enable row level security;

drop policy if exists "sahip gecmisi gorur" on public.business_data_history;
create policy "sahip gecmisi gorur" on public.business_data_history
  for select using (public.is_owner(business_id));

create or replace function public.keep_business_data_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.data is distinct from new.data then
    insert into public.business_data_history (business_id, data, changed_by)
    values (old.business_id, old.data, auth.uid());
    delete from public.business_data_history h
    where h.business_id = old.business_id
      and h.id not in (
        select id from public.business_data_history
        where business_id = old.business_id
        order by changed_at desc
        limit 30
      );
  end if;
  return new;
end;
$$;

drop trigger if exists business_data_history on public.business_data;
create trigger business_data_history
  before update on public.business_data
  for each row execute function public.keep_business_data_history();

-- 6) Hesap silinince paket kaydı da silinir (silinen hesaba ait kişisel veri kalmaz)
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'oturum yok';
  end if;
  delete from public.entitlements where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
