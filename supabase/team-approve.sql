-- Hesabım: ekip üyeliği düzeltmeleri.
-- 1) Ekip üyesi birden fazla işletmeye eklendiğinde ana işletmesi her seferinde aynı olsun (önceden sıra belirsizdi).
--    Sıra: kendi işletmesi (sahip), sonra katılmak için istek gönderdiği işletme, sonra ilk eklendiği işletme.
-- 2) Katılma onayında yetkili, üyenin hangi işletmelerini göreceğini seçer.
-- Supabase SQL Editor'de bir kez çalıştırın. Birden fazla kez çalıştırmak zarar vermez.

create or replace function public.my_membership()
returns table (business_id uuid, role text)
language sql security definer stable set search_path = public as $$
  select m.business_id, m.role
  from public.business_members m
  where m.user_id = auth.uid()
  order by
    (m.role = 'owner') desc,
    (m.business_id = (
      select r.business_id from public.join_requests r
      where r.requester_id = auth.uid() and r.status = 'approved'
      order by r.created_at desc
      limit 1
    )) desc nulls last,
    m.joined_at,
    m.business_id
  limit 1;
$$;

grant execute on function public.my_membership() to authenticated;

-- Katılma onayında yetkili, üyenin hangi işletmelerini göreceğini seçer (chosen). Seçim gönderilmezse
-- (eski uygulama sürümleri) üye yetkilinin tüm işletmelerine eklenir. Ekip sınırı paket kadardır.
drop function if exists public.decide_join(uuid, boolean);

create or replace function public.decide_join(req uuid, approve boolean, chosen uuid[] default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  r public.join_requests%rowtype;
  owner uuid;
  owner_plan text;
  max_members int;
  current_members int;
begin
  select * into r from public.join_requests where id = req;
  if not found or not public.is_owner(r.business_id) then
    raise exception 'yetkisiz';
  end if;
  if approve then
    select owner_id into owner from public.businesses where id = r.business_id;
    if chosen is not null and not exists (
      select 1 from public.businesses b where b.owner_id = owner and b.id = any(chosen)
    ) then
      raise exception 'isletme_secilmedi';
    end if;

    -- Yetkilinin geçerli paketi ve paketin izin verdiği üye sayısı (yetkili hariç)
    select coalesce((select e.plan from public.entitlements e
                     where e.user_id = owner and e.expires_at > now()), 'free')
      into owner_plan;
    max_members := case owner_plan when 'pro' then 2 when 'proplus' then 4 when 'premium' then null else 0 end;

    if max_members is not null then
      select count(distinct m.user_id) into current_members
      from public.business_members m
      join public.businesses b on b.id = m.business_id
      where b.owner_id = owner and m.role = 'member' and m.user_id <> r.requester_id;
      if current_members >= max_members then
        raise exception 'ekip_siniri';
      end if;
    end if;

    insert into public.business_members (business_id, user_id, role)
    select b.id, r.requester_id, 'member'
    from public.businesses b
    where b.owner_id = owner and (chosen is null or b.id = any(chosen))
    on conflict (business_id, user_id) do nothing;
    update public.join_requests set status = 'approved' where id = req;
  else
    update public.join_requests set status = 'rejected' where id = req;
  end if;
  update public.business_notifications set read = true where request_id = req;
end;
$$;

revoke execute on function public.decide_join(uuid, boolean, uuid[]) from public, anon;
grant execute on function public.decide_join(uuid, boolean, uuid[]) to authenticated;
