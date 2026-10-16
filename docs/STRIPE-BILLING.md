# Stripe billing deployment checklist

The billing code is on main, but payments must **not** be offered as live until the Stripe configuration and webhook have been tested.

## Required Vercel server environment variables

- `STRIPE_SECRET_KEY` — use an appropriate Stripe test/live secret key, **server only**. Never prefix with VITE_.
- `STRIPE_WEBHOOK_SECRET` — webhook signing secret from the Stripe endpoint below.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — existing server credentials.
- `BOOKING_ALLOWED_ORIGIN` — canonical HTTPS site origin, e.g. `https://www.movein-media.co.uk`.

Webhook destination: `https://www.movein-media.co.uk/api/stripe/webhook`.
Subscribe to `checkout.session.completed` and `invoice.paid`. Verify the endpoint in **test mode** before going live.

## Required Stripe settings

Enable successful-payment email receipts in Stripe's customer emails settings. Checkout creates an invoice for paid one-off payments; Stripe handles its receipt/invoice emails, while monthly payments use Stripe-hosted invoices. Set your business name, support email, VAT and tax treatment in Stripe. Test both payment methods.

## Workflow

1. New bookings are initially unpriced. Admin enters a final GBP amount in the staff dashboard.
2. Agent chooses pay per booking or monthly invoicing.
3. For individual payments, agent uses Stripe Checkout. Only signed Stripe webhook events mark a booking paid.
4. For monthly billing, the administrator selects **Send monthly invoice** on an approved agent. This groups that agent's currently unbilled monthly bookings into a Stripe invoice with 14 days to pay. **This is administrator-triggered**, not an automatically scheduled invoice.
5. Stripe emails the monthly invoice and receipts, subject to Stripe account email settings. Webhook marks invoice line bookings paid.

Do not create duplicate live invoices if an API request times out. Inspect the customer/invoices in Stripe first. Stripe idempotency keys reduce duplicate creation risk but do not replace reconciliation.

### Important remaining hardening

Before production usage, implement a robust event-id deduplication ledger, handle asynchronous Checkout payment events, recover interrupted monthly invoice creation, and verify receipt URLs/Stripe invoice links for each booking. No test payment has been run yet.
