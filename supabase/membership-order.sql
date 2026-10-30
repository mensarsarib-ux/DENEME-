-- Hesabım: ekip üyesi birden fazla işletmeye eklendiğinde ana işletmesi her seferinde aynı olsun.
-- Önceden sıra belirsizdi; üyenin ana işletmesi açılıştan açılışa değişebiliyor, işletme adları karışıyordu.
-- Sıra: kendi işletmesi (sahip), sonra katılmak için istek gönderdiği işletme, sonra ilk eklendiği işletme.
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
