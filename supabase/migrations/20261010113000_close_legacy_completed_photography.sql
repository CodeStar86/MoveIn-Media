-- Allow client closure of legacy completed photography bookings with no uploaded media.
-- Deliveries containing media still require a completed download/purge before confirmation.
create or replace function private.client_complete_photography(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.photography_bookings set client_completed_at = now()
  where id = p_booking_id and user_id = auth.uid()
    and status = 'completed' and client_completed_at is null
    and (media_deleted_at is not null or (delivery_zip_path is null and photo_count = 0));
  if not found then raise exception 'Booking not ready, already completed, or delivery not yet downloaded'; end if;
end $$;
