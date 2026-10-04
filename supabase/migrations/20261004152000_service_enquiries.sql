create table if not exists public.service_enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  email text not null check (length(trim(email)) between 3 and 320),
  phone text not null default '' check (length(phone) <= 50),
  service text not null check (service in (
    'general',
    'digital-decluttering',
    'virtual-staging',
    'property-descriptions',
    'property-photography',
    'estate-agents',
    'airbnb-short-lets',
    'other'
  )),
  message text not null check (length(trim(message)) between 10 and 5000),
  source_path text not null default '' check (length(source_path) <= 500),
  status text not null default 'new' check (status in ('new','read','replied','closed')),
  reply_message text check (reply_message is null or length(reply_message) <= 10000),
  read_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists service_enquiries_status_created_idx
  on public.service_enquiries (status, created_at desc);

alter table public.service_enquiries enable row level security;

revoke all on table public.service_enquiries from anon, authenticated;
grant insert (name, email, phone, service, message, source_path) on public.service_enquiries to anon, authenticated;
grant select on table public.service_enquiries to authenticated;
grant update (status, reply_message, read_at, replied_at) on public.service_enquiries to authenticated;

drop policy if exists service_enquiries_create on public.service_enquiries;
create policy service_enquiries_create on public.service_enquiries
for insert to anon, authenticated
with check (
  status = 'new'
  and reply_message is null
  and read_at is null
  and replied_at is null
);

drop policy if exists service_enquiries_admin_read on public.service_enquiries;
create policy service_enquiries_admin_read on public.service_enquiries
for select to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists service_enquiries_admin_update on public.service_enquiries;
create policy service_enquiries_admin_update on public.service_enquiries
for update to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
