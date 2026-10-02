-- MoveIn Media backend baseline.
-- This migration mirrors the production Supabase schema and is safe to use for fresh environments.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  address text not null check (length(trim(address)) between 1 and 500),
  customer_name text not null check (length(trim(customer_name)) between 1 and 200),
  service text not null check (service in ('declutter','stage','description','declutter-description','stage-description')),
  price_pence integer generated always as (
    case service
      when 'declutter' then 2000
      when 'stage' then 5000
      when 'description' then 2000
      when 'declutter-description' then 3500
      when 'stage-description' then 6500
      else null
    end
  ) stored,
  notes text not null default '' check (length(notes) <= 5000),
  status text not null default 'draft' check (status in ('draft','awaiting_payment','paid','processing','ready','cancelled')),
  description text check (length(description) <= 20000),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

revoke all on table public.orders from anon, authenticated;
grant select on table public.orders to authenticated;
grant insert (user_id, address, customer_name, service, notes) on public.orders to authenticated;
grant update (status, description) on public.orders to authenticated;

drop policy if exists orders_create on public.orders;
create policy orders_create on public.orders
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'draft'
  and description is null
);

drop policy if exists orders_read on public.orders;
create policy orders_read on public.orders
for select to authenticated
using (
  user_id = (select auth.uid())
  or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists orders_staff_update on public.orders;
create policy orders_staff_update on public.orders
for update to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-photos',
  'property-photos',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists photos_create on storage.objects;
create policy photos_create on storage.objects
for insert to authenticated
with check (
  bucket_id = 'property-photos'
  and (
    (
      (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      and (storage.foldername(name))[3] = 'output'
      and exists (
        select 1 from public.orders o
        where o.id::text = (storage.foldername(name))[2]
          and o.user_id::text = (storage.foldername(name))[1]
      )
    )
    or
    (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and (storage.foldername(name))[3] = 'source'
      and exists (
        select 1 from public.orders o
        where o.id::text = (storage.foldername(name))[2]
          and o.user_id = (select auth.uid())
          and o.status = 'draft'
      )
    )
  )
);

drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects
for select to authenticated
using (
  bucket_id = 'property-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
);

drop policy if exists photos_update on storage.objects;
create policy photos_update on storage.objects
for update to authenticated
using (
  bucket_id = 'property-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[3] = 'source'
  and exists (
    select 1 from public.orders o
    where o.id::text = (storage.foldername(name))[2]
      and o.user_id = (select auth.uid())
      and o.status = 'draft'
  )
)
with check (
  bucket_id = 'property-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[3] = 'source'
  and exists (
    select 1 from public.orders o
    where o.id::text = (storage.foldername(name))[2]
      and o.user_id = (select auth.uid())
      and o.status = 'draft'
  )
);

create or replace function private.submit_order(order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  n integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into o
  from public.orders
  where id = order_id and user_id = auth.uid()
  for update;

  if not found then raise exception 'Order not found'; end if;
  if o.status = 'awaiting_payment' then return; end if;
  if o.status <> 'draft' then raise exception 'Order is already submitted'; end if;

  select count(*) into n
  from storage.objects
  where bucket_id = 'property-photos'
    and name like o.user_id::text || '/' || o.id::text || '/source/%';

  if n > 20 or (o.service <> 'description' and n < 1) then
    raise exception 'Upload 1 to 20 images before submitting';
  end if;

  if o.service like '%description%' and length(trim(o.notes)) = 0 then
    raise exception 'Property facts are required';
  end if;

  update public.orders set status = 'awaiting_payment' where id = o.id;
end
$$;

revoke all on function private.submit_order(uuid) from public, anon;
grant execute on function private.submit_order(uuid) to authenticated;

create or replace function public.submit_order(order_id uuid)
returns void
language sql
set search_path = ''
as $$ select private.submit_order(order_id) $$;

revoke all on function public.submit_order(uuid) from public, anon;
grant execute on function public.submit_order(uuid) to authenticated;
