alter table public.orders
  add column if not exists paid_at timestamptz;

comment on column public.orders.paid_at is 'Timestamp set by the verified Stripe webhook after successful payment.';
