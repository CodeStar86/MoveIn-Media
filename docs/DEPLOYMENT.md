# GitHub → Vercel deployment

## 1. Publish this folder as a GitHub repository

In the `MoveIn-Media` directory, initialise Git if needed, then connect it to a **new empty GitHub repository**.

```bash
git init
git add .
git commit -m "Prepare MoveIn Media for GitHub and Vercel"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPO.git
git push -u origin main
```

Do not upload `node_modules`, `.env`, or `.vercel` — they are excluded by `.gitignore`. Confirm no real secrets appear in commit history. This project uses **pnpm** and deliberately contains only `pnpm-lock.yaml`; delete any local `package-lock.json` created by earlier npm installations before pushing.

## 2. Import on Vercel

1. Vercel dashboard → Add New → Project → Import Git Repository. Authorise GitHub if prompted, then select the MoveIn Media repository.
2. Framework Preset: **Vite**. Root Directory: `./` if this repository contains the contents of `MoveIn-Media` at the top level. (If you push an outer folder instead, set the root to `MoveIn-Media`.)
3. Install Command: `pnpm install --frozen-lockfile`; Build Command: `pnpm run build`; Output Directory: `dist`.
4. Configure the variables from `.env.example` under Project Settings → Environment Variables for Production and the environments where booking forms should work. Preview deployments using a different domain need their own origin policy; don't use production secrets on untrusted previews.
5. Deploy, then attach the verified production domain under Settings → Domains. Configure the chosen canonical hostname consistently with `BOOKING_ALLOWED_ORIGIN`, sitemap and SEO tags.
6. GitHub `main` pushes deploy to production automatically when the Vercel GitHub integration is enabled. GitHub Actions `ci.yml` runs typecheck, tests and build on pushes and PRs; it does not deploy or apply database migrations.

## 3. Provision dependencies and verify functionality

- Create the Supabase project and apply the SQL files from `supabase/migrations` in filename order. Do not assume Vercel applies them.
- Confirm Cloudflare Turnstile site key and server-side verification work and that Resend has a verified sender domain.
- Test the actual deployed form. Check request records in Supabase and email status; deliberately test email failure handling.
- Test refresh/navigation on deep pages and `/api/book` on the deployed site, plus mobile, accessibility and performance.
- Monitor booking failures. Finalise legal documents and disclosure/retention practices before accepting real customer data.

---

# Additional production integration checklist

The booking API saves every accepted request to Supabase **before** sending the Resend notification. A failed Resend notification returns HTTP 202 after successful database persistence and records the failure in `email_deliveries` for manual follow-up. HTTP 200 means saved and Resend accepted the notification (not necessarily delivered to the inbox).

## Required before accepting real enquiries

1. Create/connect a Supabase project. Run `supabase/migrations/20261015170000_create_booking_backend.sql` in SQL Editor. Inspect all five tables. Database schema is **not applied automatically** by deploying the website.
2. In Vercel project settings, configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as **server-only** environment variables. Do not prefix these with `VITE_`; never put the service role key in browser code. Prefer a dedicated server-only secret key with appropriate backend permissions when available.
3. Configure `VITE_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` for bot verification. Missing Turnstile configuration blocks bookings by design. Add separate edge/network rate limiting for volumetric abuse.
4. Configure `RESEND_API_KEY`, `BOOKING_FROM_EMAIL`, and `BOOKING_TO_EMAIL`. Verify sender domain in Resend. Missing Resend configuration will still store bookings but no notification is sent; you must monitor Supabase if that happens.
5. Set `BOOKING_ALLOWED_ORIGIN` to the exact production origin, e.g. `https://www.movein-media.co.uk`. Configure the domain, HTTPS and DNS in Vercel. Other origins are blocked when an Origin header is supplied.
6. Make a real booking through the production domain. Verify Supabase `customers`, `properties`, `booking_requests`, `booking_events`, and `email_deliveries` and check the email inbox. Test an intentionally failed Resend call; the booking should still be saved and marked failed.
7. Finalize and obtain professional review for privacy policy, terms, photography consent and retention/disclosure obligations. Check mobile and keyboard navigation, Lighthouse, links, and social previews. Install monitoring, rollback and alerting for `email_deliveries.delivery_status = 'failed'`.
8. Run `pnpm run typecheck`, `pnpm test`, and `pnpm run build` in CI / deployment environment. This archive does not include a live deployment or verified third-party credentials.

## Data handling

All five Supabase tables have RLS enabled and `anon` / `authenticated` table grants revoked. Only the server-side service role writes them. Never expose customer information in public logs. Define a documented retention/deletion process before production; no automatic deletion job is currently configured.

## Caveats

- The request flow currently writes customer, property, booking, and event records in separate REST calls. An interrupted request can leave an orphan customer/property. For strict atomicity at volume, replace this with a private transactional server-side RPC or Supabase Edge Function.
- Retries can create duplicate bookings; plan idempotency enforcement before high-volume launch.
- Database saving and email provider acceptance have not been verified against live services here.
