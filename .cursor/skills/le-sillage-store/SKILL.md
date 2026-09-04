---
name: le-sillage-store
description: Project-specific guidance for the Le Sillage Next.js perfume storefront. Use when working in this repository on storefront, account, admin, schema, or email code paths.
---

# Le Sillage Store

Le Sillage is a Philippine retail perfume storefront and admin portal built on Next.js 16 App Router, Drizzle ORM with Supabase Postgres (via the `postgres` driver — matching LapTrip's stack), Auth.js (Google + Facebook + email/password), Gmail SMTP for notifications, and Vercel Blob for image storage. There is no payment gateway — payment is manual via uploaded QR receipts.

## Core business rules

- Product types: `FULL_BOTTLE`, `PARTIAL`, `DECANT`. A product can have more than one SKU (e.g. two sizes, or — for a decant — two provenances at the same size). `buildVariantOptions()` in `src/lib/catalog.ts` is the single builder behind every size picker (shop grid cards, PDP, cart line items) — it groups SKUs by `${sizeMl}::${provenance}` into a two-tier picker: the always-visible tier-1 button always names both size and provenance (e.g. "10ML · In-house"), and a tier-2 condition/packaging picker renders underneath only when that group actually has more than one SKU to distinguish (never shown otherwise). `findSelectedVariant()` resolves whichever leaf SKU is selected, top-level or a sub-option, into one flat display shape — it lives in `src/domain/variant-options.ts`, not in the `"use client"` `size-picker.tsx`, specifically so Server Components (the PDP) can call it directly.
- Default fulfillment: `FULL_BOTTLE` → `PRE_ORDER`, `PARTIAL`/`DECANT` → `ON_HAND`. Admin can override.
- **Decant fulfillment/stock depends on `sku.provenance`**, not just `productType === "DECANT"` — see `effectiveFulfillment`/`resolveCartCap` in `src/lib/cart.ts` (the single source of truth; `src/lib/catalog.ts` has an equivalent `decantVariantFulfillment` helper for the read-only catalog-card path):
  - `IN_HOUSE` (poured to order from a whole bottle the store owns): fulfillment/cap are computed live from the product's shared `remainingMl` pool via `decantFulfillment()` — never from the SKU's own `stock`/`fulfillment` columns, which are inert for this case. This is what every decant SKU was before the Retail/In-house split existed.
  - `RETAIL` (bought pre-made as a decant directly from the perfumery): a distinct physical unit, handled exactly like a full-bottle SKU — its own `stock`/`fulfillment` columns are the real source of truth, and it can genuinely sell out. Order-time stock reservation (`reserveStockWithinTx` in `src/lib/orders.ts`) branches the same way: `IN_HOUSE` decants reserve against the ml pool (`ML_RESERVED`), `RETAIL` decants reserve per-unit stock (`ORDER_RESERVED`) like any non-decant SKU.
  - The admin product page's per-SKU Provenance/Fulfillment/Stock fields for a decant are one small client component (`src/components/admin/decant-sku-fields.tsx`) — Fulfillment/Stock only render (and only matter) when Provenance is switched to Retail, alongside a manual Cost price/Retail price pair so a Retail decant can be priced independently of the product's reference formula (`upsertSku` branches on this; `resyncSkuPricesForProduct` skips any SKU with `provenance === "RETAIL"` so a "Save product" never overwrites it).
- Stock is tracked for `ON_HAND`. `PRE_ORDER` has no stock cap. `sku.isTester` is a per-SKU checkbox on `FULL_BOTTLE`/`PARTIAL` SKUs that marks the unit as eligible for the decant-promo free-tester draw — it remains a normal sellable listing (shop, PDP, cart). A decant is never given away as a bonus tester unit, so the checkbox is hidden (preserved via a hidden input) on decant SKU forms rather than exposed as a product-level setting. Don't confuse this with `sku.provenance = 'TESTER'`, a separate field describing a non-decant physical bottle's origin (shown as a badge, unrelated to the tester-bonus pool).
- Condition (`BNIB`/`SEALED`/`FEW_SPRAYS_MISSING`) and Packaging (`WITH_BOX`/`BOTTLE_ONLY`) only apply to `FULL_BOTTLE`/`PARTIAL` SKUs — hidden (as hidden inputs preserving the stored value) on decant SKU forms, since neither describes a decant.
- "Buy Now" (`src/components/store/buy-now-button.tsx`, `?buyNow=<skuId>:<qty>` on `/checkout`) prices and orders exactly one item with zero cart interaction — it never reads or clears the cart. `createOrderFromCart` (`src/lib/orders.ts`) takes an optional `directItems` input for this path; `src/lib/cart.ts`'s `loadPricedDirectItem`/`loadDirectItemViewForBothMethods` mirror the cart-based pricing functions for it.
- Pricing: store `costPrice` (admin only) and `retailPrice` (customer-visible). Pricing mode determines how `retailPrice` is computed from `costPrice`: percentage markup, fixed markup, or direct price.
- Discounts stack across three independent types but never within a type — one active discount of each type per order, at most:
  - **Item discount**: a product's own `productDiscounts` row, or the admin's site-wide discount toggle on `/admin/promo` — `bestDiscount()` in `src/domain/discount.ts` picks whichever saves the customer more.
  - **Order discount**: a promo code (`/admin/promo-codes`) scoped to the merchandise subtotal, applied after item discounts.
  - **Delivery discount**: a promo code scoped to the delivery fee, evaluated after the order discount.
  - A promo code's minimum-spend condition is always checked against the already-discounted amount at that point in the pipeline, never the original price. A code that would compute to a ₱0 discount against real numbers is rejected outright rather than silently consuming a redemption.
- Promo codes support: percentage or fixed amount, optional minimum spend, first-order-only, once-per-customer, a redemption cap, and start/end dates. Eligibility is re-validated server-side at order creation — never trusted from the client — inside the same transaction as the order insert, with the code row locked (`SELECT ... FOR UPDATE`) so two concurrent checkouts can't both exceed a redemption cap.
- Decant promo: when the discounted merchandise subtotal of decants reaches ₱2,000, the order gets free delivery AND one tester drawn from the same fragrance families / brands the customer purchased. If no compatible tester is in stock, mark the tester as `PENDING` for admin fulfillment.
- Delivery: ₱120 flat by default (admin-configurable), pickup is free. Delivery fee is replaced by ₱0 under the decant promo, independent of any delivery-scope promo code (which stacks on top).
- ETAs: `PRE_ORDER` is 3–30 days; `ON_HAND` ordered on Saturday/Sunday qualifies for same-day delivery; otherwise 1–2 days. Mixed orders show both windows.
- Order statuses: `AWAITING_PAYMENT → RECEIPT_SUBMITTED → CONFIRMED → SHIPPED → COMPLETED`, plus `REJECTED` and `CANCELLED` (require reason). State transitions are enforced server-side with `never`-checked exhaustive switches. An order still on `AWAITING_PAYMENT` two hours after it entered that status gets **one** payment-nudge email (`paymentReminderSentAt`; hourly cron `GET /api/cron/payment-reminders`, also `npm run payment-reminders`). Cancelling sends an `order_cancelled` confirmation email.
- ON_HAND inventory is reserved at receipt submission in a single DB transaction. Stock is restored exactly once if a receipt-submitted order is later rejected or cancelled (including a `CONFIRMED → CANCELLED` transition, which reserves stock the same as `RECEIPT_SUBMITTED` does).
- Customer accounts are required for checkout, receipt submission, and order history. Browsing and cart editing remain open to guests. Carts merge on sign-in (with a conflict dialog if both a guest and account cart have items).
- Customers never see `costPrice`. Admin never sees payment API integrations because none exist.
- Philippine delivery addresses use cascading Province → City/Municipality → Barangay selects (`PhAddressFields`, backed by the PSGC dataset via `src/lib/ph-locations.ts` and `/api/ph-locations/*`), not freeform text. Region isn't a visible field — it's auto-derived from the chosen province and stored on `addresses.region`/the order's `addressSnapshot`. City and Barangay are disabled until their parent is chosen; Postal code and Street stay free text.

## File layout

- `src/db/` — Drizzle schema + `db()` client. SQL migration scripts and one-off data scripts live in `scripts/` (matching LapTrip: `npm run db:migrate`, `npm run db:seed`). There's no `src/db/seed.ts` — seeding is `scripts/seed.ts`.
- `src/domain/` — money, pricing, discounts, promo codes, decant promo, ETA, cart pricing, checkout totals, and order-state logic. Pure functions only.
- `src/actions/` — Server Actions for cart (`cart-actions.ts`), orders (`order-actions.ts`), promo codes (`promo-code-actions.ts`, `admin-promo-code-actions.ts`), account (`account-actions.ts`), auth (`auth-actions.ts`, `auth-credentials-actions.ts`), and admin (`admin-actions.ts`, `admin-catalog-actions.ts`, `admin-qr-actions.ts`). There's no `src/actions/orders.ts` or `src/actions/admin/` subdirectory — admin order-status transitions live in `admin-actions.ts`.
- `src/lib/` — env validation, blob, email, storage (Supabase), rate limits, auth helpers, PH location lookups (`ph-locations.ts`), and formatters.
- `src/app/(store)/` — storefront routes.
- `src/app/account/` — authenticated customer area.
- `src/app/admin/` — protected admin area.
- `src/components/store/` and `src/components/admin/` — UI by surface.

## Mobile-first

Every layout, typography, navigation, and interactive component must be built and tested at narrow viewports first, then enhanced for larger screens.

## Loading states

- Static page chrome (headers, titles, nav, copy that doesn't depend on a DB fetch) renders immediately in `loading.tsx` — never wrap it in a skeleton.
- Only the regions that actually fetch data show a skeleton, and it must be shaped like — and only like — the real content it's replacing; a shared skeleton component reused across routes needs a prop (e.g. `showCount`) wherever one caller's real content differs from another's, so it never skeletons a region that has no matching real content on that route.
- Route-level: every `page.tsx` doing server-side data fetching needs a matching `loading.tsx`. A dynamic segment's own value (e.g. `[category]`, `[skuId]`) isn't readable inside `loading.tsx` — Next.js doesn't pass `params`/`searchParams` to it — so that one piece stays a skeleton even on an otherwise fully-static fallback.
- Same-route client interactions that re-fetch via search params (filter tabs, sort, pagination) need their own Suspense boundary keyed to the changing param, since `loading.tsx` alone does not retrigger for query-string-only navigation on the same route.

## Documentation

Append a single bullet to `CHANGELOG.md` for every change.
