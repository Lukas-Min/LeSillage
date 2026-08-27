# Changelog

All notable changes to Le Sillage are documented here. Newest entries on top.

## [Unreleased]
### Added
- `loading.tsx` for every route that was missing one (26 pages: all `(auth)` routes, `about`/`contact`/`faq`/`how-to-pay`/`policies`/`cart`/`bottles`/`decants`, `account/profile`/`notifications`/`delete`, and 10 admin pages) so every page shows a skeleton instead of a blank screen while it loads
- `scripts/set-admin-password.ts` (`npm run db:set-admin-password`) hashes `ADMIN_PASSWORD` from env into the admin user's `passwordHash` so email/password login works
- Homepage "Browse by type" tiles (Decant / Full bottle / Partial) in `src/app/page.tsx`: one row, no price, just a link to the shelf

### Changed
- Restored `/shop` as the single catalog page (All / Decants / Full bottles / Partials tabs); `/bottles` and `/decants` now redirect there and every internal link (header, footer, hero, PDP back-link, cart/checkout, wishlist, orders, 404) was repointed to `/shop`
- Home hero now shows a flagship product panel (brand, name, tagline, price, CTAs) plus an italic closing quote, matching the Maison Ivre reference
- `CompositionCanvas` only renders the real note pyramid on the PDP (`showComposition` prop); catalog cards and the hero use a plain bottle glyph placeholder instead of leaking fallback note text
- Shipping & delivery and Returns & authenticity are always-visible static sections on the PDP instead of a collapsible accordion; Composition stays collapsible
- Cart drawer empty state redesigned with an icon, heading, subtext, and a "Browse the catalog" link
- Search overlay copy matches the reference ("Search the shelf", placeholder, "Type to search the catalog.")
- Account sidebar (`src/components/store/account-nav.tsx`) is shared between customers and admins; admin tools render as a labeled sub-list under the same sidebar instead of a separate admin-only layout, and the duplicate "Dashboard"/"Home" entry was removed
- Global corner radius tightened (0.625rem to 0.35rem) with hover-lift/shadow transitions on product cards and the new browse tiles

### Fixed
- `src/lib/rate-limit.ts` crashed every password sign-in/sign-up with a 500 because a raw `Date` was interpolated into a `sql` template instead of using Drizzle's `lt`/`gte` operators
- `AccountBottomNav` (mobile) was hardcoded to customer links even inside `/admin`, so admins on a phone had no way to reach any admin tool and "Home" dropped them into the customer account; it now shows the admin item set (horizontally scrollable) whenever the path is under `/admin`

### Added
- Maison Ivre restyle across customer surfaces: composition canvas (live note pyramid), search overlay, cart drawer, and account preview sheet
- Gold `Button` variant and catalog `types[]` filter so `/bottles` loads only full bottles and partials

### Changed
- PDP left column is now the composition canvas instead of a product photo; decant sizes stay 3–30 ml with no full-bottle pill
- Shipping and returns disclosures open by default on the PDP, policies page, cart page, and cart drawer
- Home shelves split into bottles and decants; product cards use the composition tile plus a gold Add control
- URL-backed shop filters for All, Decants, Full bottles, and Partials, plus GET search by name, brand, and family
- Shared catalog loader and full-link product cards with square images and 3ml–30ml decant price ranges
- Shared decant ml pool (`product.sourceMl` / `product.remainingMl`) with a 10ml pre-order threshold
- Admin product, SKU, image, discount, and ml-pool management with archive-first deletion
- Email/password signup and sign-in with hashed 6-digit verification codes, password reset, and JWT sessions
- Authentication and security notification email templates, plus an order-created payment email
- Postgres guest and account carts with guest-to-user merge, checkout line review, saved addresses, and live delivery vs pickup totals
- Customer profile, addresses, wishlist add-to-cart, marketing opt-in, and reauthentication-gated account deletion

### Changed
- Auth.js session strategy switched from database to JWT, with `sessionVersion` for password, email, and deletion revocation
- Decant availability and order snapshots now use derived fulfillment from the ml pool instead of per-size unit stock
- Home shelves, sitemap, admin nav (Customers, Audit), and promo settings include the new catalog and threshold fields

### Added
- New top-level storefront routes `/bottles` (FULL_BOTTLE + PARTIAL with type pills) and `/decants` (DECANT with size pills), with `/shop` redirecting to the right surface based on `?type`
- PDP redesign matching the reference layout: gold brand eyebrow, accord strip, size pills, price + save chip, qty stepper + Add to bag + wishlist strip, and a Composition accordion with top/heart/base notes
- Collapsible Shipping & Returns blocks on the PDP, `/policies`, and the cart summary, all sourced from `src/lib/policy-copy.ts`
- Shared `DisclosureAccordion` primitive in `src/components/ui/disclosure-accordion.tsx` for always-visible, collapsible content rows

### Changed
- Store header primary nav swapped `Shop` for `Bottles` + `Decants`; in-app links to the catalog now point to `/bottles` or `/decants`
- Tightened storefront surfaces against the reference: editorial centred grid header, square cream-bordered product cards and image tiles, square-edged filter pills, italic family line on the PDP with a thin gold-rule card, square-edged size pills with `FULL · 100ML` option on bottle SKUs, gold-fill `Add to bag` button, and a 3-column Top / Heart / Base notes strip inside the Composition accordion
- Shared `Section`/`PageHeader`/`EmptyState`/`StatTile`/`SurfaceCard`/`OrderStatusPill` primitives in `src/components/ui/section.tsx` and `src/components/ui/status-pill.tsx`
- Admin Fragrantica import at `/admin/products/fragrantica` powered by Fragella with a manual HTML/JSON paste fallback; fields stored on `product` and a daily cron refreshes products older than 15 days
- Vercel cron schedule in `vercel.json` calling `/api/cron/fragella-refresh` once per day
- Loading skeletons at `src/app/loading.tsx` and `src/app/account/loading.tsx`; polished error and not-found pages

### Changed
- Storefront header now includes an Account dropdown with Profile / Orders / Wishlist / Addresses and uses a gold underline for the active nav link
- Storefront footer is a four-column layout with phone, email, and Instagram handle pulled from env
- Home (`/`) redesigned with a hero, three curated shelves, a step-by-step "how it works" panel, and a "new here" callout

### Fixed
- Guest cart merge runs from a client effect after sign-in instead of during the `/account` layout render, so the edge runtime no longer throws `revalidatePath` during render
- Facebook sign-in uses OAuth state checks only so Auth.js PKCE does not fail the Meta callback
- Production TypeScript build: Auth.js account linking is a provider option, admin product save no longer returns a form-action value, and the cart test SKU fixture matches the schema
- Unused catalog helper arguments and a leftover promo-config wrapper removed from the storefront loaders
- Brand pages decode slugs once so names like Maison Ivre display and filter correctly
- Collection slug `middle-eastern` maps to `MIDDLE_EASTERN` instead of 404ing
- Guest cart, checkout totals, and payment QR empty state now share the database cart and promo rules
- Account default-address helper was restored after a broken function body

### Security
- Passwords hashed with bcryptjs at cost 12; verification codes stored only as hashes with attempt limits and 10-minute expiry
- JWT cookies cannot be revoked server-side except via `sessionVersion`; password change, email change, and deletion increment it

### Added
- Strict transaction-capable driver: `drizzle-orm/neon-serverless` with a pooled client in `src/db/client.ts`, so `db.transaction()` works for stock reservation and tester assignment
- Three-axis condition model on `sku` (`condition` BNIB/Sealed/FewSprays/PartialMl, `provenance` Retail/Tester, `packaging` WithBox/BottleOnly) and `fragranceCategory` on `products` (Niche/Designer/MiddleEastern)
- Optional list tables `option_list` and `option_value` plus `/admin/settings` editor with add/activate/deactivate flows and `audit_log` rows on each change
- `notification_log` table recording every email attempt with status, replacing the previous practice of mixing email failures into `orders.notes`
- `orders.promoTesterResult` now defaults through a single `priceCart` pass; reserved stock decrements atomically inside the transaction
- Original price + discounted price + saving now carried on every priced line, and `order_item` snapshots `originalUnitCentavos` so discounts that end later still appear in past orders
- Shared `<Price>` component used by the catalog, product detail, cart, checkout form, order detail, and emails; always renders the original struck through beside the discounted price with a saving badge
- Single OAuth sign-in: `/admin/login` and the admin-session module were removed; `Auth.js` signIn and createUser callbacks promote `le.sillage.mnl@gmail.com` to `ADMIN` based on the email
- PH phone validation: shared `phMobileSchema` enforces 10 digits starting with `9`, strips a leading `0`, and is enforced on the checkout form and the server-side order action; orders store E.164 (`+639XXXXXXXXX`)
- Private receipt route at `/api/admin/file` that verifies the admin role, normalizes the requested path against the `private/` prefix, rejects traversal, and streams the local file when no Blob token is set
- Loading skeletons (catalog-like card grids and shape-matching single skeletons) for every async storefront, account, checkout, and admin route, plus a shared `<SubmitButton>` so action buttons stay disabled while their server action runs
- New static and admin pages for the full reachable graph: `/about`, `/faq`, `/brands`, `/brands/[brand]`, `/collections/[category]`, `/search`, `/account/profile`, `/account/notifications`, `/account/delete`, `/admin/products/[productId]`, `/admin/products/new`, `/admin/customers`, `/admin/customers/[userId]`, `/admin/audit`
- Security headers in `next.config.ts`: CSP, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Content-Type-Options: nosniff`
- `vitest.config.mjs` so Vitest's ESM loader can pick up the project config

### Changed
- `src/domain/cart.ts` reads `sku.retailPrice` directly instead of recomputing it from `costPrice`, making the catalog and the charged price agree
- `bestDiscount` now compares realized savings against the actual unit price so percentage and fixed discounts rank fairly
- Receipt submission decoupled: emails send after the database commit and never roll back a valid transition; failures are recorded in `notification_log`
- Stock release is idempotent: each released SKU/order pair is recorded once, so rejecting an order twice never double-credits inventory
- Order snapshots now store the real product name (not the brand) and capture `originalUnitCentavos`, `condition`, `provenance`, `packaging`, and `fragranceCategory`
- Free-delivery promo eligibility is evaluated from the `priceCart` output instead of a duplicated discount calculation, fixing the silent deadlock where `totalsDraft` always passed `0` as line totals
- The store header now also links to the new collections, brands, search, and contact surfaces, so every view in the graph is reachable by clicking
- Admin dashboard counts pending receipts, awaiting payments, and low-stock SKUs in parallel via `Promise.all`

### Fixed
- `.gitignore` no longer excluded `.env.example`, which the `.env*` pattern was silently ignoring, and now also excludes `.blob/` so locally stored receipts cannot be committed
- The "promo can never award a tester" bug: `reserveStockForOrder` now selects candidates with `isTester = true AND stock > 0` instead of intersecting with the purchased SKUs
- `cart.ts` "source of truth" bug: `priceCart` no longer recomputed retail price from cost, so the catalog price now equals the checkout price
- Order snapshots no longer stored the brand as the product name
- Two IDOR-style queries (`/checkout/payment` and `/account/orders/[orderId]`) now filter by `userId` and the target id in SQL, not in JavaScript
- Rate-limit key derivation now reads real `x-forwarded-for` / `x-real-ip` headers instead of an empty `new Headers()`, and the limiter upserts atomically with a unique index on `(bucket, key)`
- `lib/blob.ts` no longer reads past `byteLength` when validating the magic-byte signature
- `lib/email.ts` failures no longer append into the customer-visible `orders.notes` field
- The reject action in the admin order row disables while pending and requires a non-empty reason

### Removed
- `/admin/login` route and `src/lib/admin-session.ts` — admin is granted by the Auth.js session role, not a separate cookie session
- `src/lib/csrf.ts` — Next.js already compares `Origin` to `Host` for every Server Action

### Security
- Rate limits now key on the real IP plus the user/session scope, with an atomic upsert so concurrent attempts cannot double-consume quota
- Stock reservation runs as one transaction; the planning check-then-write race was the root cause of oversell risk
- Admin-only file route checks the Auth.js session role on every request and resolves any path against the `private/` allowlist before reading from disk
- Receipt submission rejects duplicate uploads before re-reserving stock
- Gmail app-password rotation remains required at https://myaccount.google.com/apppasswords; the value in `.env.local` is now committed only to that single local file
### Added
- Initial project scaffold from `create-next-app@latest` with Tailwind v4 and shadcn/ui (Radix base)
- Strict environment validation in `src/lib/env.ts`; placeholder values in `.env.example`
- Brand-aware globals (`cream` / `charcoal` / `gold`) and mobile-first typography/layout
- Domain documentation rule and project skill scaffolded under `.cursor/rules/` and `.cursor/skills/`
- Custom review agents scaffolded under `.cursor/agents/` for domain/inventory and storefront/accessibility
- Full Drizzle schema for products, SKUs, images, discounts, promo settings, QR codes, stock movements, orders, immutable order items, receipts, customers/auth, carts, addresses, wishlist, audit, and rate limits in `src/db/schema.ts`
- Money, discount, pricing, ETA, order-state, promo, and cart helpers in `src/domain/`
- Auth.js configuration with Google and Facebook OAuth providers and Drizzle adapter in `src/auth.ts`
- Email (Nodemailer) helpers and customer/admin notification templates in `src/lib/email.ts` and `src/lib/email-templates.ts`
- Order transactional helpers that reserve stock and assign testers atomically in `src/lib/orders.ts`
- Server Actions for cart, checkout, receipts, and admin operations in `src/actions/`
- Storefront routes: home, shop catalog, product detail, cart, checkout, payment, how-to-pay, contact, policies in `src/app/(store)/`
- Account routes gated by Auth.js session: profile, orders list/detail, addresses, wishlist in `src/app/account/`
- Admin routes protected by signed cookie sessions: login, dashboard, orders, products, promo, QR codes in `src/app/admin/`
- Admin order actions for confirm / mark shipped / reject with required reason
- Guest and authenticated carts with localStorage persistence and merge-on-sign-in
- Sitemap and robots in `src/app/sitemap.ts` and `src/app/robots.ts`
- Vitest suite covering pricing, promo, ETA, order-state, and cart (25 tests passing)
- ESLint clean, TypeScript strict passes

### Added
- Local `.env.local` with generated `AUTH_SECRET`, Gmail SMTP credentials, and admin email; `DATABASE_URL` left as a placeholder pending Neon provisioning
- Stack realigned to match LapTrip: Supabase Postgres via the `postgres` driver, `scripts/migrate.ts` + `scripts/seed.ts` migration entries, `@supabase/ssr` + `@supabase/supabase-js` clients in `package.json`, `src/lib/storage.ts` helper for signed Supabase Storage URLs, and Supabase credential slots in `.env.example`
- Live dev stack now wired: Supabase project `ijqobofmnteqdalpqhnq` (Asia-Pacific), `DATABASE_URL` pooler on `:6543`, `DATABASE_DIRECT_URL` on `:5432` for migrations, Supabase anon + service-role keys in `.env.local`, baseline migration applied (`scripts/migrate.ts`), seed loaded, `npm run dev` serves `/`, `/shop`, `/collections/*`, `/cart`, redirects `/admin` to `/sign-in`
- `src/db/client.ts` prefers `DATABASE_URL` (Supabase pooler) for runtime, since the direct `db.*` host is not DNS-resolvable from this network
- CSP is dev-conditional: production keeps `'self' 'unsafe-inline'` only; development adds `'unsafe-eval'` plus `ws://localhost:3030` so React's dev-only stack-trace reconstruction and Turbopack's HMR socket still work without warnings
- Dev/start port moved from 3000 (LapTrip) to 3030 so both projects can run side-by-side; `APP_PORT` added to env schema with that default, `package.json` scripts pass `-p 3030`, README and `.env.example` redirect URIs updated to match

### Fixed
- `.gitignore` no longer excludes `.env.example`, which the `.env*` pattern was silently ignoring so the template could never be committed

### Security
- `.blob/` added to `.gitignore` so locally stored customer payment receipts cannot be committed
- Gmail app password supplied in `.env.local` was shared over chat and must be rotated at https://myaccount.google.com/apppasswords after the first successful send
- `costPrice` is not exposed to customer routes
- Receipt uploads are validated by MIME and magic-byte signature, limited to 8 MB
- Admin sessions are HMAC-signed and DB-backed with a 6-hour TTL
- All order totals, discounts, and stock changes are computed server-side; receipt submission reserves stock atomically