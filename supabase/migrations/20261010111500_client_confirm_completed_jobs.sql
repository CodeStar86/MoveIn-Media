-- Client confirmation archives delivered jobs from active dashboards without deleting accounting records.
alter table public.orders add column if not exists client_completed_at timestamptz;
alter table public.photography_bookings add column if not exists client_completed_at timestamptz;

create or replace function private.client_complete_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.orders set client_completed_at = now()
  where id = p_order_id and user_id = auth.uid()
    and status = 'ready' and client_completed_at is null
    and (service = 'description' or media_deleted_at is not null);
  if not found then raise exception 'Order not ready, already completed, or delivery not yet downloaded'; end if;
end $$;
revoke all on function private.client_complete_order(uuid) from public, anon;
grant execute on function private.client_complete_order(uuid) to authenticated;
create or replace function public.client_complete_order(p_order_id uuid)
returns void language sql security invoker set search_path = '' as $$
select private.client_complete_order(p_order_id) $$;
revoke all on function public.client_complete_order(uuid) from public, anon;
grant execute on function public.client_complete_order(uuid) to authenticated;

create or replace function private.client_complete_photography(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.photography_bookings set client_completed_at = now()
  where id = p_booking_id and user_id = auth.uid()
    and status = 'completed' and media_deleted_at is not null
    and client_completed_at is null;
  if not found then raise exception 'Booking not ready, already completed, or delivery not yet downloaded'; end if;
end $$;
revoke all on function private.client_complete_photography(uuid) from public, anon;
grant execute on function private.client_complete_photography(uuid) to authenticated;
create or replace function public.client_complete_photography(p_booking_id uuid)
returns void language sql security invoker set search_path = '' as $$
select private.client_complete_photography(p_booking_id) $$;
revoke all on function public.client_complete_photography(uuid) from public, anon;
grant execute on function public.client_complete_photography(uuid) to authenticated;
