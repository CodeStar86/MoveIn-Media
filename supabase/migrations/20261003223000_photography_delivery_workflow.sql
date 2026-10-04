alter table public.photography_bookings
  add column if not exists delivery_zip_path text,
  add column if not exists media_deleted_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists photo_count integer not null default 0 check (photo_count >= 0 and photo_count <= 100);

comment on column public.photography_bookings.delivery_zip_path is 'Private storage path for the photographer delivery ZIP.';
comment on column public.photography_bookings.media_deleted_at is 'Set after the client downloads the ZIP and all stored photography media is purged.';
comment on column public.photography_bookings.delivered_at is 'Set when the assigned photographer sends the completed ZIP to the client.';
comment on column public.photography_bookings.photo_count is 'Number of completed photos currently uploaded for this booking.';
