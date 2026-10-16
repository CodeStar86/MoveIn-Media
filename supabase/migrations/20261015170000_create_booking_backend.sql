-- MoveIn Media booking backend, initial schema.
-- Run in Supabase SQL Editor or with your standard migration process.
-- Private by default: only trusted server-side service_role may access these tables.
-- This migration does not connect the current booking API to the database.

begin;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  email text not null check (length(email) <= 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null check (length(trim(phone)) between 7 and 40),
  agency_name text check (agency_name is null or length(agency_name) <= 150),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_email_idx on public.customers (lower(email));

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  address text not null check (length(trim(address)) between 1 and 300),
  postcode text not null check (length(trim(postcode)) between 3 and 12),
  property_type text not null check (property_type in ('Flat','House','Maisonette','Commercial / other')),
  property_size text not null check (length(trim(property_size)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists properties_customer_idx on public.properties(customer_id);
create index if not exists properties_postcode_idx on public.properties(upper(replace(postcode, ' ', '')));

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  purpose text not null check (purpose in ('New listing','Refresh existing listing','Rental or Airbnb')),
  preferred_date date not null,
  preferred_time text not null check (preferred_time in ('Morning','Afternoon','Flexible')),
  package_selection text not null check (package_selection in (
    'Essential Property Marketing — from £169',
    'Complete Property Marketing — from £249',
    'Not sure — please advise'
  )),
  instructions text check (instructions is null or length(instructions) <= 3000),
  status text not null default 'new' check (status in ('new','contacted','confirmed','completed','cancelled','spam')),
  source text not null default 'website' check (length(source) between 1 and 80),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_requests_dates_reasonable check (preferred_date >= date '2025-01-01')
);
create index if not exists bookings_customer_idx on public.booking_requests(customer_id);
create index if not exists bookings_property_idx on public.booking_requests(property_id);
create index if not exists bookings_status_date_idx on public.booking_requests(status, preferred_date);
create index if not exists bookings_submitted_idx on public.booking_requests(submitted_at desc);

create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_requests(id) on delete cascade,
  event_type text not null check (event_type in ('created','status_changed','note_added','email_sent','email_failed')),
  previous_status text,
  new_status text,
  note text check (note is null or length(note) <= 3000),
  created_at timestamptz not null default now()
);
create index if not exists booking_events_booking_time_idx on public.booking_events(booking_id, created_at desc);

create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_requests(id) on delete cascade,
  provider text not null default 'resend',
  provider_message_id text,
  recipient_email text not null check (length(recipient_email) <= 254),
  delivery_status text not null default 'pending' check (delivery_status in ('pending','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text check (last_error is null or length(last_error) <= 1000),
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists email_deliveries_booking_idx on public.email_deliveries(booking_id);
create index if not exists email_deliveries_status_idx on public.email_deliveries(delivery_status, created_at);

-- Keep updated_at accurate on updates, without privileged SECURITY DEFINER functions.
create or replace function public.movein_touch_updated_at()
returns trigger language plpgsql security invoker
set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.movein_touch_updated_at() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['customers','properties','booking_requests','email_deliveries'] loop
    if not exists (select 1 from pg_trigger where tgname = 'movein_touch_updated_at' and tgrelid = format('public.%I', t)::regclass) then
      execute format('create trigger movein_touch_updated_at before update on public.%I for each row execute function public.movein_touch_updated_at()', t);
    end if;
  end loop;
end $$;

-- All booking data contains personal information; expose no direct browser access.
alter table public.customers enable row level security;
alter table public.properties enable row level security;
alter table public.booking_requests enable row level security;
alter table public.booking_events enable row level security;
alter table public.email_deliveries enable row level security;

revoke all on table public.customers, public.properties, public.booking_requests,
  public.booking_events, public.email_deliveries from anon, authenticated;
grant select, insert, update, delete on table public.customers, public.properties,
  public.booking_requests, public.booking_events, public.email_deliveries to service_role;

comment on table public.customers is 'Customer contact records, server-side access only';
comment on table public.properties is 'Properties associated with a customer';
comment on table public.booking_requests is 'Website booking enquiries and their operational status';
comment on table public.booking_events is 'Booking timeline / status audit events';
comment on table public.email_deliveries is 'Outbound booking email attempts and delivery state';

commit;
