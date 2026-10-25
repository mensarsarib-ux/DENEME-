-- Hesabım: ortak işletmeler, üyelik, katılma istekleri ve bildirimler.
-- Supabase SQL Editor'de bir kez çalıştırın (setup.sql ve devices.sql'den sonra).

-- ---------- Tablolar ----------

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.business_members (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  requester_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.business_notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null,
  message text not null,
  request_id uuid references public.join_requests (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.business_data (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.join_requests enable row level security;
alter table public.business_notifications enable row level security;
alter table public.business_data enable row level security;

-- ---------- Yardımcı fonksiyonlar (politikalarda özyineleme olmasın diye) ----------

create or replace function public.is_member(bid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.business_members where business_id = bid and user_id = auth.uid());
$$;

create or replace function public.is_owner(bid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.business_members where business_id = bid and user_id = auth.uid() and role = 'owner');
$$;

-- Katılmak isteyen kişi için: yetkilinin e-postasıyla işletmeyi bul (şifre gerekmez)
create or replace function public.find_business_by_owner_email(owner_email text)
returns table (id uuid, name text)
language sql security definer stable set search_path = public as $$
  select b.id, b.name
  from public.businesses b
  join auth.users u on u.id = b.owner_id
  where lower(u.email) = lower(trim(owner_email));
$$;

-- ---------- Yeni işletme: sahip otomatik üye olur ----------

create or replace function public.add_owner_membership() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.business_members (business_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

drop trigger if exists businesses_owner_membership on public.businesses;
create trigger businesses_owner_membership
  after insert on public.businesses
  for each row execute function public.add_owner_membership();

-- ---------- Katılma isteği gelince sahibine bildirim ----------

create or replace function public.notify_join_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.business_notifications (business_id, kind, message, request_id)
  values (new.business_id, 'join_request', 'Yeni bir kişi işletmenize katılmak istiyor.', new.id);
  return new;
end;
$$;

drop trigger if exists join_requests_notify on public.join_requests;
create trigger join_requests_notify
  after insert on public.join_requests
  for each row execute function public.notify_join_request();

-- ---------- Üyenin verisinde değişiklik olunca sahibine bildirim ----------

create or replace function public.notify_data_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  owner uuid;
begin
  select owner_id into owner from public.businesses where id = new.business_id;
  if auth.uid() is not null and auth.uid() <> owner then
    insert into public.business_notifications (business_id, kind, message)
    values (new.business_id, 'data_change', 'İşletmede bir değişiklik yapıldı.');
  end if;
  return new;
end;
$$;

drop trigger if exists business_data_notify on public.business_data;
create trigger business_data_notify
  after update on public.business_data
  for each row execute function public.notify_data_change();

-- ---------- Politikalar ----------

-- businesses: üyeler görür; yalnızca sahip oluşturur, değiştirir ve silebilir
drop policy if exists "uyeler isletmeyi gorur" on public.businesses;
create policy "uyeler isletmeyi gorur" on public.businesses
  for select using (public.is_member(id));

drop policy if exists "sahip isletme olusturur" on public.businesses;
create policy "sahip isletme olusturur" on public.businesses
  for insert with check (owner_id = auth.uid());

drop policy if exists "sahip isletmeyi gunceller" on public.businesses;
create policy "sahip isletmeyi gunceller" on public.businesses
  for update using (public.is_owner(id)) with check (public.is_owner(id));

drop policy if exists "sahip isletmeyi siler" on public.businesses;
create policy "sahip isletmeyi siler" on public.businesses
  for delete using (public.is_owner(id));

-- business_members: üyeler listeyi görür; ekleme ve çıkarma yalnızca sahip
drop policy if exists "uyeler uyeleri gorur" on public.business_members;
create policy "uyeler uyeleri gorur" on public.business_members
  for select using (public.is_member(business_id));

drop policy if exists "sahip uye ekler" on public.business_members;
create policy "sahip uye ekler" on public.business_members
  for insert with check (public.is_owner(business_id));

drop policy if exists "sahip uye cikarir" on public.business_members;
create policy "sahip uye cikarir" on public.business_members
  for delete using (public.is_owner(business_id));

-- join_requests: kişi kendi isteğini gönderir ve görür; sahip hepsini görür ve onaylar
drop policy if exists "istek sahibi kendi istegini gorur" on public.join_requests;
create policy "istek sahibi kendi istegini gorur" on public.join_requests
  for select using (requester_id = auth.uid() or public.is_owner(business_id));

drop policy if exists "kisi istek gonderir" on public.join_requests;
create policy "kisi istek gonderir" on public.join_requests
  for insert with check (requester_id = auth.uid() and not public.is_member(business_id));

drop policy if exists "sahip istegi onaylar" on public.join_requests;
create policy "sahip istegi onaylar" on public.join_requests
  for update using (public.is_owner(business_id)) with check (public.is_owner(business_id));

-- business_notifications: yalnızca sahip görür ve okundu işaretler
drop policy if exists "sahip bildirimleri gorur" on public.business_notifications;
create policy "sahip bildirimleri gorur" on public.business_notifications
  for select using (public.is_owner(business_id));

drop policy if exists "sahip bildirimi okundu isaretler" on public.business_notifications;
create policy "sahip bildirimi okundu isaretler" on public.business_notifications
  for update using (public.is_owner(business_id)) with check (public.is_owner(business_id));

-- business_data: üyeler okur ve yazar (silme yok; işletme silinince kendiliğinden gider)
drop policy if exists "uyeler veriyi gorur" on public.business_data;
create policy "uyeler veriyi gorur" on public.business_data
  for select using (public.is_member(business_id));

drop policy if exists "uyeler veriyi ekler" on public.business_data;
create policy "uyeler veriyi ekler" on public.business_data
  for insert with check (public.is_member(business_id));

drop policy if exists "uyeler veriyi gunceller" on public.business_data;
create policy "uyeler veriyi gunceller" on public.business_data
  for update using (public.is_member(business_id)) with check (public.is_member(business_id));
