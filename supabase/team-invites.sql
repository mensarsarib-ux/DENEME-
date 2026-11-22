-- Hesabım: ekibe telefonla davet.
-- Yetkili, çalışanının telefon numarasını yazar (davet). Çalışan bu numarayı SMS ile doğrulayınca daveti görür ve
-- "Katıl" der: yetkilinin işletmelerine üye olarak eklenir (ayrıca onay beklemez; numarayı yetkili kendisi yazdı).
-- Katılma, onaylanmış bir katılma kaydı (join_requests) olarak da yazılır: ekip listesi ve üye silme aynen çalışır.
-- Supabase SQL Editor'de bir kez çalıştırın. Birden fazla kez çalıştırmak zarar vermez.

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  phone text not null check (phone ~ '^\+\d{8,15}$'),
  invited_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (business_id, phone)
);
alter table public.team_invites enable row level security;
revoke all on public.team_invites from anon, authenticated;
create index if not exists team_invites_phone on public.team_invites (phone);

-- Yetkili davet eder (yalnızca kendi işletmesine). Aynı numara tekrar davet edilirse süresi yenilenir.
create or replace function public.invite_member(biz uuid, p text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner(biz) then raise exception 'yetkisiz'; end if;
  insert into public.team_invites (business_id, phone, invited_by)
  values (biz, p, auth.uid())
  on conflict (business_id, phone) do update set created_at = now(), invited_by = auth.uid();
end;
$$;

-- Yetkilinin bekleyen davetleri (Ekiplerim'de listelenir)
create or replace function public.my_sent_invites()
returns table (id uuid, phone text, business_name text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select i.id, i.phone, b.name, i.created_at
  from public.team_invites i join public.businesses b on b.id = i.business_id
  where b.owner_id = auth.uid()
  order by i.created_at desc;
$$;

create or replace function public.cancel_invite(inv uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.team_invites i
  using public.businesses b
  where i.id = inv and b.id = i.business_id and b.owner_id = auth.uid();
end;
$$;

-- Giriş yapmış kişinin SMS ile doğruladığı numaraya gelen davetler
create or replace function public.my_invites()
returns table (id uuid, business_id uuid, business_name text)
language sql security definer stable set search_path = public, auth as $$
  select i.id, i.business_id, b.name
  from public.team_invites i
  join public.businesses b on b.id = i.business_id
  join auth.users u on u.id = auth.uid()
  where i.phone = u.raw_app_meta_data->>'phone_verified'
    and b.owner_id <> auth.uid()
    and not exists (select 1 from public.business_members m where m.business_id = i.business_id and m.user_id = auth.uid())
  order by i.created_at desc;
$$;

-- Daveti kabul eder: numara davetteki numara olmalı. Ekip sınırı yetkilinin paketine göredir (decide_join ile aynı).
create or replace function public.accept_invite(inv uuid)
returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  i public.team_invites%rowtype;
  me uuid := auth.uid();
  my_phone text;
  owner uuid;
  owner_plan text;
  max_members int;
  current_members int;
  req uuid;
begin
  select * into i from public.team_invites where id = inv;
  if not found then raise exception 'davet_yok'; end if;
  select u.raw_app_meta_data->>'phone_verified' into my_phone from auth.users u where u.id = me;
  if my_phone is null or my_phone <> i.phone then raise exception 'yetkisiz'; end if;

  select owner_id into owner from public.businesses where id = i.business_id;
  select coalesce((select e.plan from public.entitlements e
                   where e.user_id = owner and e.expires_at > now()), 'free')
    into owner_plan;
  max_members := case owner_plan when 'pro' then 2 when 'proplus' then 4 when 'premium' then null else 0 end;
  if max_members is not null then
    select count(distinct m.user_id) into current_members
    from public.business_members m
    join public.businesses b on b.id = m.business_id
    where b.owner_id = owner and m.role = 'member' and m.user_id <> me;
    if current_members >= max_members then raise exception 'ekip_siniri'; end if;
  end if;

  -- Davet edildiği işletmeye üye olur (yetkili diğer işletmelerini Ekiplerim'den paylaşabilir)
  insert into public.business_members (business_id, user_id, role)
  values (i.business_id, me, 'member')
  on conflict (business_id, user_id) do nothing;
  -- Onaylanmış katılma kaydı: ekip listesi, ana işletme seçimi ve üye silme bununla çalışır
  insert into public.join_requests (business_id, requester_id, status)
  values (i.business_id, me, 'approved')
  returning id into req;
  -- Ekleme tetikleyicisi "katılmak istiyor" bildirimi yazar; davette onay gerekmez, bildirim katıldı olarak düzeltilir
  update public.business_notifications
     set message = 'Davet ettiğiniz kişi ekibinize katıldı.', read = false
   where request_id = req;
  delete from public.team_invites where id = inv;
end;
$$;

revoke execute on function public.invite_member(uuid, text) from public, anon;
revoke execute on function public.my_sent_invites() from public, anon;
revoke execute on function public.cancel_invite(uuid) from public, anon;
revoke execute on function public.my_invites() from public, anon;
revoke execute on function public.accept_invite(uuid) from public, anon;
grant execute on function public.invite_member(uuid, text) to authenticated;
grant execute on function public.my_sent_invites() to authenticated;
grant execute on function public.cancel_invite(uuid) to authenticated;
grant execute on function public.my_invites() to authenticated;
grant execute on function public.accept_invite(uuid) to authenticated;

-- Davet edilen kişi reddeder: yalnızca kendi numarasına gelen davet silinir
create or replace function public.decline_invite(inv uuid)
returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from public.team_invites i
  using auth.users u
  where i.id = inv and u.id = auth.uid() and i.phone = u.raw_app_meta_data->>'phone_verified';
end;
$$;
revoke execute on function public.decline_invite(uuid) from public, anon;
grant execute on function public.decline_invite(uuid) to authenticated;

-- Kötüye kullanımı sınırlamak için: bir işletmede en fazla 50 bekleyen davet
create or replace function public.limit_invites() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.team_invites where business_id = new.business_id) >= 50 then
    raise exception 'davet_siniri';
  end if;
  return new;
end;
$$;
drop trigger if exists team_invites_limit on public.team_invites;
create trigger team_invites_limit before insert on public.team_invites
  for each row execute function public.limit_invites();

-- ---------- Telefonla açılan hesapların listelerde görünen kimliği ----------
-- Bu hesapların e-postası rastgele bir iç adrestir (@tel.hesabimmuhasebe.com). Listelerde onun yerine SMS ile
-- doğrulanmış numara gösterilir. Numara yalnızca sunucunun yazdığı app_metadata'dan okunur (kullanıcı değiştiremez).
create or replace function public.user_label(uid uuid)
returns text
language sql security definer stable set search_path = public, auth as $$
  select case
    when lower(u.email) like '%@tel.hesabimmuhasebe.com' then coalesce(u.raw_app_meta_data->>'phone_verified', u.email::text)
    else coalesce(u.email::text, '+' || u.phone::text)
  end
  from auth.users u where u.id = uid;
$$;
revoke execute on function public.user_label(uuid) from public, anon, authenticated;

create or replace function public.team_people()
returns table (user_id uuid, email text)
language sql stable security definer set search_path = public as $$
  select distinct u.id, public.user_label(u.id)
  from auth.users u
  where exists (
      select 1 from public.join_requests r
      where r.requester_id = u.id and r.status = 'approved' and public.is_owner(r.business_id))
     or exists (
      select 1 from public.business_members m
      where m.user_id = u.id and m.role = 'member' and public.is_owner(m.business_id));
$$;

create or replace function public.pending_requests()
returns table (request_id uuid, business_id uuid, business_name text, requester_email text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.business_id, b.name, public.user_label(r.requester_id), r.created_at
  from public.join_requests r
  join public.businesses b on b.id = r.business_id
  where r.status = 'pending' and public.is_owner(r.business_id)
  order by r.created_at desc;
$$;

create or replace function public.team_overview()
returns table (business_id uuid, business_name text, user_id uuid, email text, role text)
language sql stable security definer set search_path = public as $$
  select m.business_id, b.name, m.user_id, public.user_label(m.user_id), m.role
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  where public.is_owner(m.business_id)
  order by b.created_at;
$$;
