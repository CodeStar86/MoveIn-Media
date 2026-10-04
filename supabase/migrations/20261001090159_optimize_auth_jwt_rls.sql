-- Wrap auth.jwt() itself in a scalar subquery so it is initialized once per statement.

drop policy if exists orders_read on public.orders;
create policy orders_read on public.orders
for select to authenticated
using (
  user_id = (select auth.uid())
  or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists orders_staff_update on public.orders;
create policy orders_staff_update on public.orders
for update to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
