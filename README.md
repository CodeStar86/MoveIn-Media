# MoveIn Media

React + TypeScript + Vite frontend with a Vercel serverless booking endpoint (`api/book.ts`). Booking enquiries are intended to be saved to Supabase before Resend email notifications.

## Directory layout

```text
MoveIn-Media/
├── .github/workflows/ci.yml   # GitHub PR/push checks
├── api/book.ts                # Vercel serverless booking endpoint
├── docs/                      # Deployment, pricing and readiness documentation
├── public/                    # Static assets and comparison photography
├── src/                       # React website
│   ├── app/                   # Pages, routing, components, content
│   ├── index.css              # Design system / layout styling
│   └── main.tsx               # Client entry point
├── supabase/migrations/       # SQL schema changes (apply separately)
├── tests/                     # API tests
├── .env.example               # Environment variable names (no secrets)
├── package.json
├── pnpm-lock.yaml             # Single package-manager lockfile
├── vercel.json                # SPA fallback + security headers
└── vite.config.ts
```

## Run locally

Use Node.js 22.12+ and pnpm 10.6.5 (or `corepack enable` then `corepack prepare pnpm@10.6.5 --activate`).

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm run typecheck
pnpm test
pnpm build
```

Vite's local development server does **not** automatically run Vercel serverless functions. For a realistic `/api/book` test, use a Vercel preview deployment or Vercel CLI with the proper local environment variables. Do not put secret keys in `VITE_` variables.

## GitHub → Vercel

Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). On Vercel import the GitHub repo, choose **Vite**, set root directory **`./`**, build command **`pnpm run build`**, and output directory **`dist`**. The `api/` folder remains at repository root to become a Vercel Function. Pushes to `main` trigger production deployments; pull requests can receive preview deployments once GitHub is connected.

### Before taking bookings

Set all variables in `.env.example` securely in Vercel, apply the SQL migrations to your actual Supabase project, verify the sender domain in Resend, and confirm a live booking appears in the database and email flow. See [docs/PRODUCTION-READINESS.md](docs/PRODUCTION-READINESS.md). **This repository is deployment-prepared, not a live-verified production system.**
