---
name: le-sillage-store
description: Project-specific guidance for the Le Sillage Next.js perfume storefront. Use when working in this repository on storefront, account, admin, schema, or email code paths.
---

# Le Sillage Store

Le Sillage is a Philippine retail perfume storefront and admin portal built on Next.js 16 App Router, Drizzle ORM with Neon Postgres, Auth.js (Google + Facebook), and Gmail SMTP for notifications. There is no payment gateway — payment is manual via uploaded QR receipts.

## Core business rules

- Product types: `FULL_BOTTLE`, `PARTIAL`, `DECANT`.
- Default fulfillment: `FULL_BOTTLE` → `PRE_ORDER`, `PARTIAL`/`DECANT` → `ON_HAND`. Admin can override.
- Stock is tracked for `ON_HAND`. `PRE_ORDER` has no stock cap. Tester SKUs (awarded via the decant promo) use the `sku.isTester` / `sku.provenance = 'TESTER'` flag set and are excluded from the catalog.
- Pricing: store `costPrice` (admin only) and `retailPrice` (customer-visible). Pricing mode determines how `retailPrice` is computed from `costPrice`: percentage markup, fixed markup, or direct price.
- Promos: when the discounted merchandise subtotal of decants reaches ₱2,000, the order gets free delivery AND one tester drawn from the same fragrance families / brands the customer purchased. If no compatible tester is in stock, mark the tester as `PENDING` for admin fulfillment.
- Delivery: ₱120 flat; pickup is free. Delivery fee is replaced by ₱0 under the decant promo.
- ETAs: `PRE_ORDER` is 3–30 days; `ON_HAND` ordered on Saturday/Sunday qualifies for same-day delivery; otherwise 1–2 days. Mixed orders show both windows.
- Order statuses: `AWAITING_PAYMENT → RECEIPT_SUBMITTED → CONFIRMED → SHIPPED → COMPLETED`, plus `REJECTED` and `CANCELLED` (require reason). State transitions are enforced server-side with `never`-checked exhaustive switches.
- ON_HAND inventory is reserved at receipt submission in a single DB transaction. Stock is restored exactly once if a receipt-submitted order is later rejected or cancelled.
- Customer accounts are required for checkout, receipt submission, and order history. Browsing and cart editing remain open to guests. Carts merge on sign-in.
- Customers never see `costPrice`. Admin never sees payment API integrations because none exist.

## File layout

- `src/db/` — Drizzle schema, migrations, seed, client.
- `src/domain/` — money, pricing, promos, ETA, and order-state logic. Pure functions only.
- `src/actions/` — Server Actions for cart, orders, admin, and account flows.
- `src/lib/` — env validation, blob, email, rate limits, auth/session, formatter helpers.
- `src/app/(store)/` — storefront routes.
- `src/app/account/` — authenticated customer area.
- `src/app/admin/` — protected admin area.
- `src/components/store/` and `src/components/admin/` — UI by surface.

## Mobile-first

Every layout, typography, navigation, and interactive component must be built and tested at narrow viewports first, then enhanced for larger screens.

## Documentation

Append a single bullet to `CHANGELOG.md` for every change.