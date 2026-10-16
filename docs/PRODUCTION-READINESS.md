# Production readiness status — 15 October 2026

## Implemented and locally tested

- Supabase schema: five private, RLS-protected backend tables are included as a migration.
- Server-side booking endpoint validates fields and protects against malformed submissions.
- Cloudflare Turnstile bot verification; fails closed if unavailable. Separate rate limiting is not yet configured.
- Booking records are written to Supabase before attempting Resend notification.
- Email success/failure results are stored and HTTP 202 acknowledges persistence when notification fails.
- Four endpoint tests passed: invalid payloads, database-before-email sequencing, and email-provider failure.

## NOT VERIFIED / launch blockers

- Supabase project was configured in the connected environment, but this package does not automatically apply migrations. Verify the target project before launching.
- Live integration using Vercel, Supabase, Cloudflare Turnstile, and Resend credentials has NOT been run.
- Build and typecheck were attempted but not executable in the environment: dependency packages are absent and installation could not complete. Test source uses Node.js built-in TypeScript stripping, so those tests did run.
- Legal text, GDPR practices, retention/deletion, accessibility and performance require manual/professional sign-off.
- The booking system does not enforce idempotency or cross-table atomicity. Retries can duplicate records. Set up operational review of failed emails.
- No actual mobile browser/E2E check, monitoring alerts, DNS validation, or production rollback rehearsal has been run.

**Do not interpret the existence of the source code/migration as a live production deployment.** Consult DEPLOYMENT.md before launch.
