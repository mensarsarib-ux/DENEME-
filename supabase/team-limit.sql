-- Hesabım: ekip üye sınırı sunucuda da denetlenir (uygulamadaki kontrol atlatılsa bile sınır aşılamaz).
-- Supabase SQL Editor'de bir kez çalıştırın (businesses-team.sql ve plans-final.sql'den sonra).
-- Sınırlar uygulamadaki ile aynıdır (src/lib/plan.ts): ekip, yetkili dahil; Ücretsiz 1, Pro 3, Pro Plus 5, Premium sınırsız.

create or replace function public.decide_join(req uuid, approve boolean)
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
    where b.owner_id = owner
    on conflict (business_id, user_id) do nothing;
    update public.join_requests set status = 'approved' where id = req;
  else
    update public.join_requests set status = 'rejected' where id = req;
  end if;
  update public.business_notifications set read = true where request_id = req;
end;
$$;

grant execute on function public.decide_join(uuid, boolean) to authenticated;
