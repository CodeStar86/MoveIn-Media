# MoveIn Media

Production Vite + React frontend backed by Supabase Auth, Postgres and Storage.

## Local development

1. Copy `.env.example` to `.env.local` and set the two public Supabase values.
2. Install dependencies with `npm install`.
3. Run `npm run dev`.
4. Run `npm run build` before deployment.

## Production configuration

Set these variables in the hosting environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

In Supabase Authentication URL Configuration, set the production site URL to the deployed HTTPS origin and add the production `/portal` and `/login` redirects. Add localhost redirects only for development.

The SPA is configured for Vercel through `vercel.json`. Supabase schema history is stored in `supabase/migrations`.

## Security model

- `orders` uses RLS and authenticated users can only create/read their own orders.
- Admin access is determined by `app_metadata.role = admin` (never user-editable metadata).
- Property media is stored in a private bucket with user/order-scoped paths.
- Order submission is finalized by an authenticated RPC so clients cannot directly mark orders as submitted.

## Release checklist

Before the first production release, run `npm install` once from a networked machine and commit the generated `package-lock.json`. This archive could not regenerate it because the build sandbox had no npm registry access. Then run `npm run build` and deploy.

## Stripe payments

Checkout pricing is dynamic and server-controlled. The browser sends the order ID plus its current origin to the `create-checkout-session` Supabase Edge Function. The function reads the authenticated user's order from Postgres and uses the generated `price_pence` value as Stripe Checkout's `unit_amount`; the client never supplies the charge amount.

Set these Supabase Edge Function secrets before enabling live payments:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...
supabase secrets set SITE_URL=https://your-production-domain.example
```

In Stripe, create a webhook endpoint at:

```text
https://jmsynpiuekvacnzwmuhy.supabase.co/functions/v1/stripe-webhook
```

Subscribe it to `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then copy its signing secret into `STRIPE_WEBHOOK_SIGNING_SECRET`.

Checkout now returns customers to the browser origin that started the payment, with `SITE_URL` kept as a fallback for non-browser callers. This prevents successful payments from sending users to a stale Vercel preview/domain.

The webhook verifies Stripe's signature and confirms `amount_total` matches the database `price_pence` before moving an order from `awaiting_payment` to `paid`.

For local development, copy `supabase/functions/.env.example` to `supabase/functions/.env` and fill in test-mode Stripe values. Never expose `STRIPE_SECRET_KEY` or the webhook signing secret through `VITE_` environment variables.
