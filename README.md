# Le Sillage

A retail perfume storefront and admin portal for Le Sillage, Manila. Built on Next.js 16 App Router with Drizzle ORM, Supabase Postgres (via the `postgres` driver — matching the LapTrip stack), Auth.js (Google + email/password; Facebook is wired but switched off), Gmail SMTP, and Vercel Blob for storage. Scheduled jobs run from a small Cloudflare Worker (`workers/auto-reject-cron`).

Le Sillage sells **full bottles**, **tester bottles**, **partials**, and **decants**. Each listing shows whether it is **on-hand** or **pre-order**. There is **no payment gateway**: customers pay via bank QR codes and upload a payment screenshot. Item, order, and delivery discounts stack across those three types but never within one: a checkout takes at most one order promo code and one delivery promo code. Philippine delivery addresses use cascading Province → City → Barangay selects backed by PSGC data instead of freeform text.

## Mobile-first

Every page, component, and interaction is designed mobile-first and progressively enhanced for larger screens. Test on narrow viewports (≤414px) before desktop.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment and fill in real values:

   ```bash
   cp .env.example .env.local
   ```

3. Run the migration and seed (matches LapTrip's `db:migrate` + `db:seed` scripts) — only against a database of your own:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   `.env.local`'s `DATABASE_URL` is whatever these write to. If it points at the production database, don't run either: `db:migrate` re-runs every statement in `scripts/migrate.ts` each time, and while the `ADD COLUMN IF NOT EXISTS`/`CREATE TABLE IF NOT EXISTS` lines are harmless, the old backfill `UPDATE`s run again too and can undo admin edits (for example, turning pre-order back on for a full bottle whose stored fulfillment is still `PRE_ORDER`). For production, run just the new statements in the Supabase SQL editor. On Windows PowerShell, use `npm.cmd` if `npm` is blocked by the execution policy.

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3030`. Admin lives at `/admin`.

## Required services

| Service | Why | Free tier |
| --- | --- | --- |
| Supabase Postgres | Persistent storage | Yes (cloud). Locally you can also point `DATABASE_URL` at any Postgres 17 instance. |
| Vercel Blob | Images and QR codes (public store), payment receipts (separate private store) | Yes (local fallback to disk) |
| Google OAuth | Customer sign-in | Yes, up to 50k MAU |
| Facebook OAuth | Customer sign-in (switched off in `src/lib/oauth-providers.ts`) | Yes |
| Gmail SMTP | Notifications | Yes (app password) |
| Cloudflare Workers | Hourly cron trigger (`workers/auto-reject-cron`) | Yes |

## Payment

No payment API is integrated. Customers scan the admin-provided QR code from `/checkout/payment`, pay via bank transfer, and upload a screenshot. Admin reviews and confirms via `/admin/orders`.

Placing an order sends no email. An order still unpaid two hours in gets one payment reminder with a Pay by time, and an order with no receipt after 24 hours is cancelled automatically.

## Scheduled jobs

Every `/api/cron/*` route (auto-reject, payment reminders, delivery auto-complete, delivery follow-ups, archive sweep, marketing emails) runs hourly from the Cloudflare Worker in `workers/auto-reject-cron`, because Vercel Hobby only allows daily crons. `vercel.json` keeps each route once a day as a fallback, so every route must be safe to run twice. Both callers send `Authorization: Bearer $CRON_SECRET`, and the Worker's secret must match Vercel's. A new cron route goes in the Worker's `JOBS` list. Marketing email (sale and promo announcements) is queued and sent 15 per hourly run to stay under Gmail's daily limit; each one has a signed unsubscribe link, and newsletter sign-ups must confirm by email first.

## Documentation

See [CHANGELOG.md](./CHANGELOG.md) for every change, including schema, business rules, and security events.

## Security notes

- The original Gmail app password was exposed in chat and has been revoked. Generate a new app password and supply it via `GMAIL_APP_PASSWORD` in `.env.local`. Never commit `.env.local`.
- Never expose `costPrice` to customer-facing routes.
- All order totals, discounts, and stock changes are computed server-side.

## Project layout

- `src/app/(store)/` — public storefront
- `src/app/account/` — authenticated customer area
- `src/app/admin/` — protected admin area
- `src/components/` — UI by surface
- `src/db/` — Drizzle schema + Drizzle client (`postgres` driver).
- `scripts/migrate.ts`, `scripts/seed.ts` — explicit SQL migration and seed scripts (matching LapTrip's per-file `db:migrate-NNN.ts` style).
- `src/domain/` — pricing, discounts, promo codes, decant promo, ETA, cart/checkout totals, order-state (pure)
- `src/actions/` — Server Actions
- `src/lib/` — env, blob, email, auth, rate limits, PH location lookups (`ph-locations.ts`)
- `workers/auto-reject-cron/` — the Cloudflare Worker that runs the cron routes hourly (own `package.json`/`tsconfig.json`; the root `tsconfig.json` excludes `workers`)
- `code-review/` — code-review checkpoint and log (not a test suite)

## Testing

```bash
npm test
```

## Rollback

If a destructive schema change needs reverting:

1. Revert the application code.
2. Run the matching rollback statement from the comment block at the end of `scripts/migrate.ts` (in the Supabase SQL editor for production), and remove the forward statement from the script so a later run doesn't re-add it.
3. Restore inventory from `stock_movement` records.

## Deploy

- The app is on Vercel (region `sin1`); pushing to `main` deploys production. Apply any schema change to the database before the code that reads it deploys — every query selects every declared column, so code ahead of the schema fails with "column does not exist".
- The cron Worker deploys on its own: `cd workers/auto-reject-cron && npx wrangler deploy` (set its secret once with `npx wrangler secret put CRON_SECRET`).
