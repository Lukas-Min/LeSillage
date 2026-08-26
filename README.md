# Le Sillage

A retail perfume storefront and admin portal for Le Sillage, Manila. Built on Next.js 16 App Router with Drizzle ORM, Supabase Postgres (via the `postgres` driver — matching the LapTrip stack), Auth.js (Google + Facebook), Gmail SMTP, and Vercel Blob for storage.

Le Sillage sells **full bottles (pre-order)**, **partials**, and **decants** with **on-hand** fulfillment. There is **no payment gateway**: customers pay via bank QR codes and upload a payment screenshot.

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

3. Run the migration and seed (matches LapTrip's `db:migrate` + `db:seed` scripts):

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3030`. Admin lives at `/admin`.

## Required services

| Service | Why | Free tier |
| --- | --- | --- |
| Supabase Postgres | Persistent storage | Yes (cloud). Locally you can also point `DATABASE_URL` at any Postgres 17 instance. |
| Vercel Blob | Image / QR / receipt storage | Yes (local fallback to disk) |
| Supabase Storage | Signed upload URLs for `receipts` bucket (optional) | Yes |
| Google OAuth | Customer sign-in | Yes, up to 50k MAU |
| Facebook OAuth | Customer sign-in | Yes |
| Gmail SMTP | Notifications | Yes (app password) |

## Payment

No payment API is integrated. Customers scan the admin-provided QR code from `/checkout/payment`, pay via bank transfer, and upload a screenshot. Admin reviews and confirms via `/admin/orders`.

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
- `src/domain/` — pricing, promo, ETA, order-state (pure)
- `src/actions/` — Server Actions
- `src/lib/` — env, blob, email, auth, rate limits

## Testing

```bash
npm test
```

## Rollback

If a destructive schema change needs reverting:

1. Revert the application code.
2. Reverse the corresponding changes in `scripts/migrate.ts` and run it again (`npm run db:migrate` is idempotent).
3. Restore inventory from `stock_movement` records.

## Deploy

Deployment and Vercel provisioning are intentionally out of scope for this repository at this time. The app is fully runnable locally with the free-tier services listed above.
