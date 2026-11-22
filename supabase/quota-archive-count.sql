-- Ücretsiz/Pro kayıt sınırı: arşivlenmiş kayıtlar da sayılır.
-- Önceki sürüm yalnızca arşivlenmemiş kayıtları sayıyordu; bir kaydı arşivleyip yenisini eklemek sınırı aşabiliyordu.
-- Yalnızca check_data_limits fonksiyonu değişir; trigger aynı kalır. Tekrar çalıştırmak güvenlidir.

create or replace function public.check_data_limits()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  owner uuid; plan text; max_tabs int; max_items int;
  new_tabs int; old_tabs int := 0; k text;
  new_total int; old_total int;
  old_parties jsonb := '[]'::jsonb;
  new_parties jsonb := coalesce(new.data->'parties', '[]'::jsonb);
begin
  select b.owner_id into owner from public.businesses b where b.id = new.business_id;
  select coalesce((select e.plan from public.entitlements e where e.user_id = owner and e.expires_at > now()), 'free') into plan;
  if plan = 'premium' then return new; end if;
  max_tabs := case plan when 'pro' then 8 when 'proplus' then 10 else 4 end;
  max_items := case plan when 'pro' then 20 when 'proplus' then 40 else 10 end;
  new_tabs := coalesce(jsonb_array_length(new.data->'groups'), 0);
  if tg_op = 'UPDATE' then
    old_tabs := coalesce(jsonb_array_length(old.data->'groups'), 0);
    old_parties := coalesce(old.data->'parties', '[]'::jsonb);
  end if;
  if new_tabs > max_tabs and new_tabs > old_tabs then raise exception 'sekme_siniri'; end if;
  for k in select distinct e.v->>'kind' from jsonb_array_elements(new_parties) as e(v) loop
    -- Arşivliler dahil: toplam kayıt sayısı sınırı aşmamalı
    select count(*) into new_total from jsonb_array_elements(new_parties) as e(v) where e.v->>'kind' is not distinct from k;
    select count(*) into old_total from jsonb_array_elements(old_parties) as e(v) where e.v->>'kind' is not distinct from k;
    if new_total > max_items and new_total > old_total then
      raise exception 'kayit_siniri';
    end if;
  end loop;
  return new;
end;
$function$;
