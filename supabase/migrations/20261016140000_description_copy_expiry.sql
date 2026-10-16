-- Run in Supabase SQL Editor. This stores the first successful copy time.
alter table public.booking_deliverables add column if not exists description_copied_at timestamptz;

create or replace function public.movein_mark_description_copied(p_booking uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.booking_requests b
    join public.agent_profiles a on a.user_id=b.agent_id
    where b.id=p_booking and b.agent_id=auth.uid()
      and a.approval_status='approved'
  ) then raise exception 'Not authorised'; end if;
  update public.booking_deliverables
  set description_copied_at=now()
  where booking_id=p_booking and description<>'' and description_copied_at is null;
end $$;
revoke all on function public.movein_mark_description_copied(uuid) from public, anon;
grant execute on function public.movein_mark_description_copied(uuid) to authenticated;

create or replace function public.movein_clear_expired_descriptions()
returns void language sql security definer set search_path = '' as $$
 update public.booking_deliverables
 set description='', updated_at=now()
 where description<>'' and description_copied_at is not null
   and description_copied_at<=now()-interval '30 minutes';
$$;
revoke all on function public.movein_clear_expired_descriptions() from public,anon,authenticated;

-- Requires pg_cron extension enabled in Supabase Database > Extensions.
-- Execute this only once, after enabling the extension:
-- select cron.schedule('movein-clear-copied-descriptions', '* * * * *', 'select public.movein_clear_expired_descriptions();');
