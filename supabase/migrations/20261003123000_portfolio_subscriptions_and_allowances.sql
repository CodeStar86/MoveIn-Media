create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null check (plan in ('portfolio5','portfolio10','portfolio20')),
  status text not null default 'incomplete',
  allowance integer not null check (allowance in (5,10,20)),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_usage (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  period_start timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists subscription_usage_period_idx on public.subscription_usage(subscription_id, period_start);

alter table public.orders add column if not exists billing_type text not null default 'payg';
alter table public.orders add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null;
alter table public.orders add column if not exists subscription_period_start timestamptz;
alter table public.orders add column if not exists subscription_charge_pence integer not null default 0;

alter table public.orders drop constraint if exists orders_billing_type_check;
alter table public.orders add constraint orders_billing_type_check check (billing_type in ('payg','subscription_included','subscription_overage'));
alter table public.orders drop constraint if exists orders_subscription_charge_nonnegative;
alter table public.orders add constraint orders_subscription_charge_nonnegative check (subscription_charge_pence >= 0);

alter table public.subscriptions enable row level security;
alter table public.subscription_usage enable row level security;

revoke all on public.subscriptions from anon, authenticated;
revoke all on public.subscription_usage from anon, authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.subscription_usage to authenticated;

drop policy if exists subscriptions_read_own on public.subscriptions;
create policy subscriptions_read_own on public.subscriptions
for select to authenticated
using (user_id = (select auth.uid()) or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists subscription_usage_read_own on public.subscription_usage;
create policy subscription_usage_read_own on public.subscription_usage
for select to authenticated
using (user_id = (select auth.uid()) or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function private.submit_order(order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  n integer;
  s public.subscriptions;
  used_count integer;
  charge integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into o
  from public.orders
  where id = order_id and user_id = auth.uid()
  for update;

  if not found then raise exception 'Order not found'; end if;
  if o.status in ('awaiting_payment','paid','processing','ready') then return; end if;
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

  select * into s
  from public.subscriptions
  where user_id = auth.uid()
    and status in ('active','trialing')
    and current_period_start is not null
    and current_period_end is not null
    and now() >= current_period_start
    and now() < current_period_end
  for update;

  if found then
    select count(*) into used_count
    from public.subscription_usage
    where subscription_id = s.id
      and period_start = s.current_period_start;

    if used_count < s.allowance then
      insert into public.subscription_usage(subscription_id,user_id,order_id,period_start)
      values (s.id,auth.uid(),o.id,s.current_period_start)
      on conflict (order_id) do nothing;

      charge := case when o.service in ('stage','stage-description') then 3500 else 0 end;
      update public.orders
      set billing_type='subscription_included',
          subscription_id=s.id,
          subscription_period_start=s.current_period_start,
          subscription_charge_pence=charge,
          status=case when charge=0 then 'paid' else 'awaiting_payment' end,
          paid_at=case when charge=0 then now() else paid_at end
      where id=o.id;
      return;
    end if;

    if s.plan = 'portfolio20' then
      insert into public.subscription_usage(subscription_id,user_id,order_id,period_start)
      values (s.id,auth.uid(),o.id,s.current_period_start)
      on conflict (order_id) do nothing;

      charge := 1400 + case when o.service in ('stage','stage-description') then 3500 else 0 end;
      update public.orders
      set billing_type='subscription_overage',
          subscription_id=s.id,
          subscription_period_start=s.current_period_start,
          subscription_charge_pence=charge,
          status='awaiting_payment'
      where id=o.id;
      return;
    end if;

    raise exception 'Your monthly property allowance has been used. Your allowance refreshes on the next billing date.';
  end if;

  update public.orders
  set billing_type='payg', subscription_id=null, subscription_period_start=null, subscription_charge_pence=0, status='awaiting_payment'
  where id=o.id;
end
$$;

create or replace function public.subscription_summary()
returns table (
  plan text,
  status text,
  allowance integer,
  used integer,
  remaining integer,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean
)
language sql
security definer
set search_path = ''
as $$
  select s.plan,
         s.status,
         s.allowance,
         count(u.id)::integer as used,
         greatest(s.allowance - count(u.id)::integer, 0) as remaining,
         s.current_period_start,
         s.current_period_end,
         s.cancel_at_period_end
  from public.subscriptions s
  left join public.subscription_usage u
    on u.subscription_id = s.id and u.period_start = s.current_period_start
  where s.user_id = auth.uid()
  group by s.id
$$;

revoke all on function public.subscription_summary() from public, anon;
grant execute on function public.subscription_summary() to authenticated;
