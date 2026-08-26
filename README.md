# Le Sillage

A retail perfume storefront and admin portal for Le Sillage, Manila. Built on Next.js 16 App Router with Drizzle ORM, Neon Postgres, Auth.js (Google + Facebook), and Gmail SMTP for notifications.

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

3. Generate the database schema and seed it:

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`. Admin lives at `/admin`.

## Required services

| Service | Why | Free tier |
| --- | --- | --- |
| Neon Postgres | Persistent storage | Yes |
| Vercel Blob | Image / QR / receipt storage | Yes (local fallback to disk) |
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
- `src/db/` — Drizzle schema, migrations, seed
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
2. Run the generated down migration before any destructive schema rollback: `npx drizzle-kit down`.
3. Restore inventory from `stock_movement` records.

## Deploy

Deployment and Vercel provisioning are intentionally out of scope for this repository at this time. The app is fully runnable locally with the free-tier services listed above.