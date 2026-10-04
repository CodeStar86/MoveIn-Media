create index if not exists orders_subscription_id_idx on public.orders(subscription_id);
create index if not exists subscription_usage_user_id_idx on public.subscription_usage(user_id);

drop policy if exists subscriptions_read_own on public.subscriptions;
create policy subscriptions_read_own on public.subscriptions
for select to authenticated
using (
  user_id = (select auth.uid())
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists subscription_usage_read_own on public.subscription_usage;
create policy subscription_usage_read_own on public.subscription_usage
for select to authenticated
using (
  user_id = (select auth.uid())
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

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
security invoker
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
