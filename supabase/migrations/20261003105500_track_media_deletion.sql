alter table public.orders
  add column if not exists media_deleted_at timestamptz;
