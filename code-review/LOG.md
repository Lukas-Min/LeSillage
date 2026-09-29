# Code review log

Newest entry first. One entry per review run — including a run that finds
nothing, so the checkpoint always has a paper trail. See `CLAUDE.md` →
"Code review checkpoints (hard rule)" for how this file is maintained.

Entry template:

```
## <date> — <one-line label>

- **Commit range reviewed:** <from-sha>...<to-sha> (or "full codebase baseline — no prior checkpoint")
- **Effort:** low | medium | high | xhigh | max
- **Scope / areas covered:** <list, or "diff only">
- **Findings:**
  - [severity] <summary> — `file:line` — status: confirmed | fixed | plausible | skipped | no-issue
  - ...or "None found."
- **Checkpoint advanced to:** <to-sha>
```

---

## 2026-09-30 — Newsletter/marketing queue, per-customer promo codes, and the storefront redesign

- **Commit range reviewed:** `e0e5970...4f39dd5` (54 commits, 154 files under src/scripts, +6018/-1510) — the other contributors' work since the last checkpoint (one-click unsubscribe, double opt-in newsletter, hourly marketing email queue, promo codes limited to a list of customers, admin settings/forms, order summary lines) plus this session's storefront work (multi-word search, landing-page redesign and accessibility fixes, product card and grid changes, All tab and stock filter, header Shop mega menu, 21-per-page three-column grid, sort tie-break by name, rail arrows).
- **Effort:** high — 8 inline finder angles (line-by-line, removed-behavior, cross-file, reuse, simplification, efficiency, altitude, CLAUDE.md conventions), deduped, no separate verify pass.
- **Scope / areas covered:** `src/domain/email-token.ts`, `src/lib/email-links.ts`, `/api/unsubscribe`, `/unsubscribe`, `/newsletter/confirm`, `src/actions/newsletter-actions.ts`, `src/lib/marketing-recipients.ts`, `src/lib/marketing-queue.ts`, `src/domain/marketing.ts`, `/api/cron/marketing-emails`, `src/lib/cron-auth.ts`, `src/actions/admin-promo-code-actions.ts` (broadcast and chosen-customer emails), `src/domain/promo-code.ts` + `src/lib/orders.ts` + `promo-code-actions.ts` (allowed-customer checks, removed order-placed email), `src/lib/catalog.ts` (search, availability filter, sort), `src/lib/home-rails.ts`, `src/app/(store)/shop/page.tsx` + `shop-grid-sync.tsx`, `shop-menu.tsx`, `store-header.tsx`, `rail-carousel.tsx`, `catalog-pagination.tsx`, email-type and form-action rules.
- **Findings:** 9 reported, most severe first:
  1. `src/components/store/shop-menu.tsx:101` — the Shop menu's onBlur closes (unmounts) the panel when focus moves to nothing, which is what a link click does in Safari, so after opening the menu by click a card click is lost — status: fixed the same day: blur only closes the menu when focus lands on a real element outside it; a document pointerdown listener closes it on outside presses
  2. `src/domain/marketing.ts:51` — a confirmed newsletter subscriber whose address matches an unverified account gets no marketing email on either path — status: fixed the same day: a confirmed newsletter sign-up counts for an unverified account unless that account turned promotions off (tests updated and added)
  3. `src/actions/admin-promo-code-actions.ts:340` — promo-code emails ignore startsAt/endsAt, so re-saving an expired code with "Send email" ticked announces a dead code — status: fixed the same day: `hasEnded(endsAt)` skips the email on both create and edit
  4. `src/lib/marketing-queue.ts:72` — a run that dies after a successful send but before the SENT update re-sends the email when the stale SENDING row is reclaimed — status: fixed the same day: stale SENDING rows are marked FAILED ("Interrupted mid-send; not resent to avoid a duplicate") instead of being re-sent
  5. `src/app/(store)/shop/page.tsx:80` — `?page=` is kept when the page size flips between 20 and 21, so a valid page at one size can be past the end at the other — status: fixed the same day: an out-of-range ?page= shows the last real page
  6. `src/components/store/shop-menu.tsx:143` — the mega-menu panel's position depends on the header's backdrop-blur making it the containing block; removing the blur hides the menu — status: fixed the same day: the header sets `contain: layout` on purpose, so the panel no longer depends on backdrop-blur
  7. `src/lib/marketing-queue.ts:85` — every queue run loads every user, account link, and subscriber to check at most 15 recipients — status: fixed the same day: `loadMarketingRecipients(onlyEmails)` loads just the batch's recipients (checked equal to the full load on the live data)
  8. `src/lib/home-rails.ts:50` — the deals/decants rails re-implement the catalog's discount and rating comparators — status: fixed the same day: `compareByDiscount`/`compareByRating` exported from `src/lib/catalog.ts` and used by both
  9. `src/components/store/catalog-pagination.tsx:56` — pagination renders two full copies of the page-number row (phone and sm+) — status: skipped: a single render needs phone-only ellipses near the range edges, more complexity than the duplicated markup costs
- **Checkpoint advanced to:** `4f39dd58d46041287139523d018359c614d06a48` (HEAD at review time).

## 2026-09-29 — Reviewer passes on allowed-customer promo codes and sale emails; pill sizing measured (not a checkpoint review)

- **Commit range reviewed:** none as a checkpoint review — the uncommitted work behind `a6cf8bc` only, so the checkpoint does not move.
- **Effort:** medium
- **Scope / areas covered:** domain-reviewer and storefront-reviewer passes on the promo-code allowed-customers list (`promo_code_allowed_user`, `withAllowedUsers`, `CustomerMultiSelect`) and the site-wide discount subscriber email. Plus the carried backlog item "pill sizing past 576px", measured on the live shop.
- **Findings:**
  - [high] Two concurrent site-wide saves could both email every subscriber — `src/actions/admin-actions.ts` — status: fixed (read + write under `FOR UPDATE`)
  - [high] A pre-deploy admin tab posting `restrictedUserId`, or an edit post without the list field, could open a one-customer code to everyone — `src/actions/admin-promo-code-actions.ts` — status: fixed (legacy field read; `allowedUsersField` marker required to change the list)
  - [medium] An older build (rollback) would treat list-limited codes as open — status: fixed (a save keeps one listed customer in `restrictedUserId`)
  - [medium] Removing a deleted customer from a list could empty it and open the code; listed-customer emails ignored opt-out; newsletter form could switch on someone else's account; unverified sign-ups got marketing email — status: fixed
  - [low] A customer not on the list learned why else a code fails; a 0.4% sale saved as on at 0 — status: fixed
  - [low] Deleted accounts' old newsletter rows would get the first sale email — status: no-issue (`newsletter_subscriber` was created 2026-09-29, and erasure now deletes the row)
  - UI: dropdown clipped by `Card` overflow, 24px chip ×, unlabeled combobox / misplaced ARIA roles, non-option rows in the listbox, highlight scrolling out of view, focus lost on Escape / chip removal / tab-away, loading-screen and helper-copy drift, stale "Saved." status — status: fixed
  - Backlog: pill sizing past 576px — no-issue. Measured on le-sillage.vercel.app/shop at 375/575/576/768/1024/1280/1536: the grid adds columns, so the photo stays 222–277px wide from 576 up; the rating pill is 18–23% and the widest category pill 47–59% of the photo width, with no overlap, overflow, or horizontal scroll at any width.
- **Checkpoint advanced to:** unchanged (`5c0e045`)

---

## 2026-09-29 — Promo stacking, site-wide dates, and account promo codes

- **Commit range reviewed:** `5c0e045acec28228c1be4f287d0005e90c23d327...e0e5970f9aebfd1cdb5ef3c93dd1b9e344e30b93`
- **Effort:** medium
- **Scope / areas covered:** `src/domain/promo-code.ts`, `src/domain/promo.ts`, `src/domain/discount.ts`, `src/lib/orders.ts`, `src/actions/promo-code-actions.ts`, checkout form, account promo-code list, admin promo pages. One ORDER code plus one DELIVERY code, lock order, and releasing every redemption match the intended rules.
- **Findings:**
  - [medium] Checkout re-checks product-discount rows inside the order transaction but not the site-wide discount on `promo_setting`, so a discount that ends or is turned off during checkout can still be charged — `src/lib/orders.ts:171` — status: confirmed
  - [medium] Enter in the checkout promo field submits Place order. A typed code that was never applied is left off the order if policies are already accepted — `src/components/store/checkout-form.tsx:413` — status: confirmed
  - [medium] Account promo codes format `endsAt` directly. That value is the exclusive next-day boundary, so the last valid day shows one day late. Admin uses `toDisplayDate(..., "end")` — `src/app/account/promo-codes/page.tsx:67` — status: confirmed
  - [low] The promo label stays tied to `#promoCode` after both codes are applied and the input is removed — `src/components/store/checkout-form.tsx:388` — status: confirmed
  - [low] The copy control's name is only `Copy {code}`. "Copied" is not announced — `src/app/account/promo-codes/promo-code-list.tsx:78` — status: confirmed
  - [low] A code that has not started is still grouped under Valid. The note says "Not open yet"; checkout rejects it until the start — `src/app/account/promo-codes/page.tsx:51` — status: confirmed
  - [low] Archive "Email code" is under the 44px touch target — `src/app/account/archive/archive-form.tsx:89` — status: skipped. That file is not in this commit range
- **Checkpoint advanced to:** `e0e5970f9aebfd1cdb5ef3c93dd1b9e344e30b93`

---

## 2026-09-29 — Applied fixes for the open 2026-09-24 findings (not a new review)

- **Commit range reviewed:** none — fix pass only, so the checkpoint does not move. Each 2026-09-24 finding was re-checked against current code first.
- **Effort:** n/a
- **Scope / areas covered:** the 15 findings in the 2026-09-24 entry below plus its carried backlog. Separately, the new two-promo-codes-per-order change got a domain-reviewer pass: 1 medium (release path took promo-code row locks in a different order than checkout — deadlock could strand both redemptions) and 2 low findings, the medium and one low fixed.
- **Findings:**
  - #1 pickup-address leak, #2 approve/deny race, #3 pending-request bypass, #4 PICKUP "Promo applied", #5 formatDate timezone, #9 promo dialog double toast — status: fixed by earlier commits (re-verified; #9's dialog no longer exists)
  - #6 `/admin/orders?userId=` label, #7 cancellation-request failure log, #8 unawaited audit writes, #10 order-detail loading.tsx, #11 wishlist audit catch, #12 order-created text pickup block, #13 hand-built OrderEmailInput, #14 save-badge class (also a dark-mode contrast bug), #15 duplicated tab strip — status: fixed
  - Backlog: Instagram icon viewBox — fixed; decant-script fulfillment helper — no-issue (scripts deleted); pill sizing past 576px — skipped, still plausible, not re-measured
- **Checkpoint advanced to:** unchanged (`5c0e045`)

---

## 2026-09-28 — Dead code, duplicates, and static scripts

- **Commit range reviewed:** working tree on `1fea95d` (account, orders, auth, brand icons) plus `scripts/`. Not a line-by-line re-read of every domain file already covered at `748a30e`.
- **Effort:** medium
- **Scope / areas covered:** `scripts/`, unused `react-icons`, the customer order and contact pages, and the uncommitted account/auth UI that shipped in the same commit
- **Findings:**
  - [low] Catalog importers and the seed pool hardcoded paths, sizes, markup, and a copied slug helper — `scripts/import-decant-pricelist.ts`, `scripts/import-full-bottle-pricelist.ts`, `scripts/backfill-decant-metadata.ts`, `scripts/seed.ts` — status: fixed. Shared helpers in `scripts/catalog-script.ts`. A `.json` argument replaces the default file. Decant sizes come from the price keys. Seed names live in `scripts/data/seed-fragrances.json`
  - [low] `react-icons` had no remaining imports after brand-colored marks moved to `src/components/store/brand-icons.tsx` — status: fixed. Package removed
  - [low] Contact loading's row filter did not type-check once social icons were no longer Lucide components — `src/app/(store)/contact/loading.tsx` — status: fixed
  - [low] Waived delivery on the order page used a raw `12000` — `src/app/account/orders/[orderId]/page.tsx` — status: fixed. Uses `DEFAULT_DELIVERY_FEE_CENTAVOS`
  - [info] `scripts/import-catalog.ts` still writes the live database with no dry-run — status: confirmed. Left as-is; the old importers did the same
  - [info] Cron scripts stay thin wrappers. Their dynamic imports exist so env loads before `getEnv()` — status: no-issue
- **Checkpoint advanced to:** `5c0e045acec28228c1be4f287d0005e90c23d327`

---

## 2026-09-28 — Review of the script cleanup commit

- **Commit range reviewed:** `d2621e7...53a62e0`
- **Effort:** medium
- **Scope / areas covered:** `scripts/import-catalog.ts`, the three pricelist importers, `scripts/data/*.json`, deleted one-time scripts, `package.json`. The pickup-address change in `d2621e7` was re-read with it.
- **Findings:**
  1. `scripts/import-catalog.ts` — running it writes the live database immediately. There is no `--apply` dry-run, unlike `flag-tester-pool.ts` — status: confirmed. Left as-is because the old importers behaved the same way
  2. `src/domain/pickup.ts` — cancelled and rejected orders hide the address even when a receipt was submitted earlier — status: confirmed, intentional
  3. Cancellation race, pending-cancellation bypass, pickup "Promo applied" emails, and Manila timezone on dates — status: confirmed, still open, not in this commit
- **Checkpoint advanced to:** not advanced. Still `748a30e14c39b6b642bcfd6f93fd86027741b9c6`. The commits between that checkpoint and `d2621e7` were not re-read line by line.

---


- **Commit range reviewed:** full re-audit requested. This pass did not re-read every file. It checked the 15 findings still open from `748a30e` (2026-09-24), the SEO and catalog-cache commits through `2790727`, and `scripts/`.
- **Effort:** medium
- **Scope / areas covered:** `src/domain/pickup.ts`, catalog cache in `src/lib/catalog.ts`, live production deploy status, and the one-off product scripts under `scripts/`.
- **Findings:**
  1. `src/domain/pickup.ts` — cancelled or rejected orders with no receipt showed the home address — status: fixed locally, not committed or deployed
  2. `src/lib/orders.ts` — cancellation Approve/Deny race — status: confirmed, still open
  3. `src/components/admin/order-row-actions.tsx` — pending cancellation can be bypassed by other admin buttons — status: confirmed, still open
  4. `src/lib/orders.ts` — pickup status emails say "Promo applied" for free delivery — status: confirmed, still open
  5. `src/lib/utils.ts` — `formatDate` / `formatDateTime` are not pinned to Asia/Manila — status: confirmed, still open
  6. `scripts/add-*.ts` — one hardcoded script per fragrance — status: fixed. Those files are deleted. New listings use `scripts/upsert-listing.ts`. `import-decant-pricelist.ts` and `import-full-bottle-pricelist.ts` stay, because they store exact per-size prices rather than a markup formula
  7. Findings 6–15 from the 2026-09-24 log were not re-verified in this pass — status: skipped
- **Checkpoint advanced to:** not advanced. Left at `748a30e14c39b6b642bcfd6f93fd86027741b9c6` so the next review still starts there. A line-by-line pass of the whole tree was not done.

---

## 2026-09-17 — Full codebase baseline audit

- **Commit range reviewed:** full codebase baseline — no prior checkpoint existed. Session diff `bc6e6c3...8f29827` (this session's 5 commits: HTML order emails, marquee fix, tester-bonus feature, instant-save toggle, tester-pool script) was also scanned as one of the angles.
- **Effort:** high, expanded to whole-repo scope at the user's request ("not just this session, check for everything")
- **Scope / areas covered:** 9 parallel finder angles — session diff line-by-line; order lifecycle & stock reservation (`src/lib/orders.ts`, `src/domain/order-state.ts`, `src/domain/promo.ts`); checkout/cart/pricing (`src/domain/cart.ts`, `src/domain/discount.ts`, `src/lib/cart.ts`); promo codes (`src/domain/promo-code.ts`, `src/actions/*promo-code-actions.ts`); the email system (`src/lib/email*.ts`, `src/lib/order-email-lines.ts`, `src/lib/payment-reminders.ts`, `src/lib/delivery-followups.ts`); admin/auth/catalog authorization (`src/actions/admin-actions.ts`, `admin-catalog-actions.ts`, `src/auth.ts`, admin tester UI); storefront/account UI (`promo-marquee.tsx`, checkout, account, order-confirm); loading-state & mobile-first CLAUDE.md conventions; reuse/simplification/efficiency/altitude/test-coverage. ~14 candidates from these angles were then independently verified by 6 follow-up verifier agents before reporting.
- **Findings:** 10 reported (all CONFIRMED), ranked most severe first — full detail in the review tool's findings, summarized here:
  1. `src/lib/orders.ts:164` — cart checkout never re-validates live stock before creating an order; the eventual failure at receipt-submit time is unhandled and reaches the customer as a redacted generic error — status: fixed (pre-existing, not from this session)
  2. `src/domain/discount.ts:77` — FIXED discount computed per-unit for PDP display (`applyDiscount`) but per-line at checkout (`applyLineDiscount`) — displayed price and charged price diverge at quantity > 1 — status: fixed (pre-existing)
  3. `src/lib/catalog.ts:234` — `bestDiscount` called with quantity=1 for display vs the real cart quantity at checkout — the winning discount type can flip between the two — status: fixed (pre-existing)
  4. `src/lib/orders.ts:1054` — `transitionOrderStatus` has no transaction/row lock; a concurrent customer-cancel and admin-confirm can race and leave status inconsistent with which side effects ran — status: fixed (pre-existing)
  5. `src/lib/orders.ts:947` — `releaseStockForOrder` TOCTOU allows double-release of stock if called concurrently (enabled by #4) — status: fixed (pre-existing)
  6. `src/lib/orders.ts:725` — in-house tester reservation (`reserveTesterUnit`) never re-checks `isTester`, unlike the RETAIL path — a concurrent admin detoggle can still consume ml from a SKU just removed from the tester pool — status: fixed (**introduced this session**, e94a2b8)
  7. `src/app/account/orders/[orderId]/page.tsx:123` — passes a line-level discount into a component expecting a per-unit value, showing a wrong "saved %"/amount for multi-quantity discounted lines on past orders — status: fixed (pre-existing)
  8. `src/lib/email-html.ts:101` — order-email line totals recomputed via `unitPriceCentavos * quantity` instead of the authoritative `lineTotalCentavos`, can drift a centavo from the real order total — status: fixed (**introduced this session**, afdda64)
  9. `src/lib/orders.ts:275` — promo min-spend eligibility and stored order totals use SKU pricing read before the transaction lock, never re-verified as live — status: fixed (pre-existing)
  10. `src/actions/admin-promo-code-actions.ts:82` — promo start/end dates parsed as UTC midnight (8:00 AM PHT) instead of Philippine midnight — status: fixed (pre-existing)

  Investigated and explicitly ruled out (not real bugs): a claim that `releaseTesterWithinTx` re-derives release amounts from a SKU's *current* `sizeMl` — refuted, it uses the immutable historical `delta` stored on each `stock_movement` row; a claim that the in-house tester reservation's missing `.for("update")` allows two orders to double-spend the same ml — refuted, the conditional `UPDATE ... WHERE remainingMl >= ml` is already atomic against that specific race (only the `isTester`-recheck gap, finding #6, is real).
- **Checkpoint advanced to:** `8f29827dec106dbdec22151da00fd9a2d0eee69e` (the commit reviewed above — see the follow-up entry below for the fix commit itself, which is new code the checkpoint doesn't yet cover)

---

## 2026-09-17 — Applied fixes for all 10 baseline-audit findings

- **Commit range reviewed:** N/A — this is not a fresh review, it's the fix pass for the 10 findings logged above. The fix commit's own code (the discount/pricing plumbing changes especially) has not itself been through a review yet; the next `/code-review` should pick it up as part of its normal diff-since-checkpoint scope.
- **Effort:** N/A (fix application, not a review)
- **Scope / areas covered:** the same 10 files/lines named above.
- **Findings:** all 10 fixed — see each item's updated status above for what changed. Notably, closing #2/#3 (the FIXED-discount PDP-vs-checkout divergence and the quantity-dependent winning-discount flip) required threading a `discounts: VariantDiscount[]` list from `buildVariantOptions` through `SizePickerOption`/`VariantSubOption`, `BuyBox`/`DecantBuyBox`, and a new `pickHighestSaving` export in `src/domain/discount.ts`, so `<Price>` can re-pick the winner and the true line total from the live quantity instead of a server-computed quantity-1 snapshot. Verified: `tsc --noEmit` clean, `eslint` clean (no new issues; the 3 pre-existing `react-hooks/set-state-in-effect` errors are untouched), `vitest run` 120/121 passing (the 1 failure is the pre-existing, unrelated `pricing-parity` seed-data check), plus targeted throwaway numeric checks for the discount-flip math and the promo-date PHT boundary/round-trip.
- **Checkpoint advanced to:** unchanged — still `8f29827dec106dbdec22151da00fd9a2d0eee69e`, since the fix commit itself hasn't been reviewed yet.

---

## 2026-09-18 — Diff-since-checkpoint review: full-bottle pre-order feature, width/pickup/Instagram, badge/icon UI

- **Commit range reviewed:** `8f29827dec106dbdec22151da00fd9a2d0eee69e...f64b602` (57 files) — the 10-fix commit from the entry above plus the full-bottle pre-order feature (`595205b`), the width/pickup/Instagram commit (`f64b602`); the later badge/icon UI commits (`3b954b3`, `9686395`) postdate this diff snapshot and are intentionally left for the *next* review.
- **Effort:** high — 4 finder angles dispatched (full-bottle correctness, 10-fix correctness re-check, removed-behavior auditor, cross-file tracer).
- **Scope / areas covered:** `resolveBottleAvailability` and its call sites in `src/lib/cart.ts`/`src/lib/catalog.ts`/`src/app/(store)/shop/[skuId]/page.tsx`/`src/actions/admin-catalog-actions.ts`; every code path that creates a FULL_BOTTLE SKU (admin catalog actions, Fragrantica import, both bulk-import scripts, dev seed script); the checkout price/discount re-verification block and `transitionOrderStatus`/`releaseStockForOrder` locking added in the prior fix commit; the promo-code PHT date-parsing rewrite.
- **Findings:** 8 reported, most severe first:
  1. `src/actions/fragrantica-actions.ts:161` — Fragrantica-imported FULL_BOTTLE SKUs got no `availableForPreOrder`, silently invisible on `/shop` — status: fixed
  2. `scripts/import-full-bottle-pricelist.ts:1` — same gap in the bulk pricelist importer — status: fixed
  3. `scripts/add-full-bottles-batch-2.ts:1` — same gap in the second batch-import script — status: fixed
  4. `scripts/seed.ts:202` — same gap in the dev seed script, plus its `SeedSkuInput` type didn't declare the field (caught by `tsc --noEmit` after the fix) — status: fixed
  5. `src/lib/orders.ts` (checkout re-verification block) — re-checks per-product `productDiscounts` but not `promoConfig.siteWideDiscount`, so a site-wide discount change mid-checkout isn't caught — status: plausible, not fixed this pass
  6. `src/actions/admin-promo-code-actions.ts` (PHT date-anchoring rewrite) — no backfill for promo codes created before this change; their `startsAt`/`endsAt` now display 8 hours off in the admin edit form — status: confirmed, not fixed this pass
  7. `src/lib/orders.ts` (`submitReceipt`) — catch-all converts every thrown error to a generic `{ok:false}` with no logging, hiding the real cause — status: plausible, not fixed this pass
  8. `scripts/migrate.ts` (availableForPreOrder backfill) — only covers `fulfillment='PRE_ORDER'` rows, missing any full bottle stuck ON_HAND with stock=0; verified against live production data that 0 rows are currently affected, so latent not active — status: plausible, not fixed this pass

  All 4 FULL_BOTTLE-SKU-creation gaps (#1-4) were fixed in the same commit as this review. #5-8 are real but narrower/lower-severity and were left for a follow-up — flagged to the user.
- **Checkpoint advanced to:** `f64b602` (the last commit actually captured in this diff snapshot — the badge/icon UI commits `3b954b3`/`9686395` and the bug-fix commit from this session are newer than the snapshot and remain in scope for the next review).

---

## 2026-09-18 — Diff-since-checkpoint review: FULL_BOTTLE fix, badge/icon UI, 5-column grid + price-wrap fix

- **Commit range reviewed:** `f64b602...HEAD` (4 commits, 18 files) — the `availableForPreOrder` bug-fix commit, the badge/icon legibility commit (`3b954b3`), the Facebook/Messenger/Instagram brand-icon commit (`9686395`), and the shop-grid-to-5-columns + price-wrap-fix commit (`48d1faa`).
- **Effort:** high — 8 finder angles dispatched (line-by-line, removed-behavior auditor, cross-file tracer, reuse, simplification, efficiency, altitude, CLAUDE.md conventions), 1-vote verify pass, plus direct browser/JS measurement to verify the top finding empirically rather than by inspection alone.
- **Scope / areas covered:** `CatalogPrice`'s new responsive text sizing (`src/components/store/price.tsx`) and the grid breakpoints driving it (`src/components/store/catalog-grid.tsx`, `loading.tsx`); the badge/border legibility changes across `product-card.tsx`, `app/page.tsx`'s flagship panel, and `composition-canvas.tsx`'s `CornerLabel`; the Lucide-to-`react-icons` brand-icon swap in `contact/page.tsx` and `store-footer.tsx`; the `availableForPreOrder` duplication across the 4 SKU-creation call sites fixed in the prior commit.
- **Findings:** 8 reported, most severe first:
  1. `src/components/store/price.tsx:104` — `CatalogPrice`'s price range was genuinely clipped (e.g. "₱1,800.00" → "₱1,800.0") at 768–1279px viewport widths, because `md:text-2xl` was the largest size in the chain at exactly the point cards get narrowest, combined with a new `whitespace-nowrap` that blocked the wrap fallback — **verified live in the browser** (visible clipping screenshot + a JS sweep across the catalog showing up to 23px of `scrollWidth` overflow, some bleeding past the card's own edge) — status: **fixed in this same pass**, with the sizing rebuilt from measured card content widths (~309px mobile, ~230px 2-col, a roughly constant ~190px from 768px up) down to 2 breakpoints instead of 5, and `whitespace-nowrap` removed so any future edge case wraps instead of clipping
  2. `scripts/seed.ts` / `add-full-bottles-batch-2.ts` / `import-full-bottle-pricelist.ts` / `fragrantica-actions.ts` — the `availableForPreOrder` default (from the prior commit's fix) is a copy-pasted literal at 4 call sites instead of one shared helper, so a 5th future SKU-creation script has nothing to import and can reintroduce the same invisible-SKU bug — status: plausible, not fixed this pass
  3. `src/components/store/product-card.tsx:66` — the badge/border legibility fix overrides `className` on 3 `Badge` instances instead of fixing the underlying faint `--border` token or `Badge`'s `outline` variant; grepped 42 files using `variant="outline"` still on the untouched faint border — status: confirmed, not fixed this pass
  4. `src/components/store/loading.tsx:18` — the shop-grid skeleton's badge placeholders were `h-5` while the real badges (same diff) grew to `h-6`, violating the CLAUDE.md loading-state "shaped like the real content" rule — status: **fixed in this same pass**
  5. `src/components/store/product-card.tsx:35` — the overlay pill/badge markup is hand-duplicated in ~5 places (product-card.tsx, app/page.tsx, composition-canvas.tsx's `CornerLabel`) instead of reusing the existing shared component — status: plausible, not fixed this pass
  6. `src/components/store/store-footer.tsx:67` — `FaFacebookF`/`FaInstagram` have portrait viewBoxes vs. the square `FaFacebookMessenger`, causing subtly inconsistent glyph sizing in a fixed square icon box (visually confirmed but subtle at current size) — status: plausible, not fixed this pass
  7. `src/components/store/product-card.tsx:41` — the rating/category badge's `min-[576px]:` shrink step isn't further reduced at the new md/lg/xl tiers, unlike the price text — status: plausible, not fixed this pass
  8. `src/app/(store)/contact/page.tsx:15` — `/contact` and the footer independently duplicate the same social-link rows/URLs/icons with no shared source — status: plausible, not fixed this pass

  Findings #1 and #4 were fixed and verified (zero overflowing cards across a full JS sweep of the catalog at 576/768/1024/1280px, both the Decants and Full Bottles tabs) before this commit. #2, #3, #5–8 are real but lower-severity/architectural and were left for a follow-up — flagged to the user.
- **Checkpoint advanced to:** HEAD after the fix commit for this review (see `CHECKPOINT.md`).

---

## 2026-09-24 — Diff-since-checkpoint review: cancellation-request flow, admin order tabs, pickup-address reveal, promo-code edit dialog, Velixir catalog, promo-stacking fix, rebrand

- **Commit range reviewed:** `cf769b6...748a30e` (10 commits, 81 files, +3033/-915) — the full working session since the prior checkpoint: admin order-status-badge/reject-dialog/email-totals fixes, customer order cancellation split into instant vs. admin-approved requests, admin order tabs + reposition totals + spelled-out dates + wishlist-heart fix, real pickup-address reveal once a receipt is submitted, promo-code edit dialog, the Velixir full-bottle catalog addition (19 fragrances) and its repricing to a true 10% discount, promo-code-vs-item-discount stacking fix + shop pagination-reset fix, a low-contrast discount-badge fix, and a site-wide "Le Sillage" → "Le Sillage Manila" rebrand.
- **Effort:** max — 10 parallel finder angles (line-by-line, removed-behavior auditor, cross-file tracer, language-pitfall, wrapper/proxy correctness, reuse, simplification, efficiency, altitude, CLAUDE.md conventions), ~27 raw candidates deduped to 16, each independently verified by 1 of 3 verifier agents (15 CONFIRMED, 1 REFUTED), then a fresh gap-sweep pass (found nothing new, returned empty rather than padding).
- **Scope / areas covered:** the cancellation request/approve/deny flow end to end (`src/domain/order-state.ts`, `src/lib/orders.ts`, `src/actions/order-actions.ts`/`admin-actions.ts`, `src/components/admin/order-row-actions.tsx`, `src/components/store/cancel-order-button.tsx`); pickup-address reveal (`src/domain/pickup.ts`) and its email plumbing (`src/lib/email-templates.ts`, `email-html.ts`); the promo-code-stacking fix and its shared `orderDiscountEligibleSubtotalCentavos` base (`src/domain/checkout-totals.ts`, `promo-code.ts`); the new promo-code edit dialog (`promo-code-edit-dialog.tsx`, `promo-code-form.tsx`); admin order tabs (`src/app/admin/orders/page.tsx`); every `loading.tsx` paired with a changed `page.tsx`; the new shared `formatDate`/`formatDateTime` (`src/lib/utils.ts`); the Velixir/decant catalog scripts and `scripts/migrate.ts`/`seed.ts`; the site-wide rebrand (`src/lib/social-links.ts`, `src/components/store/store-header.tsx`/`store-footer.tsx`, `src/app/layout.tsx`); reuse/simplification/efficiency/altitude/conventions across the whole diff.
- **Findings:** 15 reported (all CONFIRMED), most severe first — full detail in the review tool's findings, summarized here:
  1. `src/domain/pickup.ts:15` — `canRevealPickupAddress` reveals the store owner's real home address on orders that reached CANCELLED/REJECTED directly from AWAITING_PAYMENT with no receipt ever submitted (both a customer instant-cancel and an admin Reject can reach this) — status: confirmed, not fixed this pass
  2. `src/lib/orders.ts:1361` — `resolveCancellationRequest`'s APPROVED branch reads the order row unlocked while DENIED locks it; a concurrent Approve/Deny race can cancel an order the customer was just told would NOT be cancelled — status: confirmed, not fixed this pass
  3. `src/components/admin/order-row-actions.tsx:116` — the pending-cancellation-request Approve/Deny panel doesn't guard the pre-existing forward/Reject/admin-cancel buttons, which silently clear the request with the wrong email and no resolve audit entry — status: confirmed, not fixed this pass
  4. `src/lib/orders.ts:1210` — `OrderEmailInput` never sets `freeDeliveryReason`/`defaultDeliveryFeeCentavos`, so every PICKUP order's confirmed/shipped/delivered/ready-for-pickup email wrongly shows "Delivery: Free · Promo applied" (plus a bogus struck-through ₱0.00 in text) — status: confirmed, not fixed this pass
  5. `src/lib/utils.ts:20` — new shared `formatDate`/`formatDateTime` set no `timeZone`, so order/audit dates can show the wrong calendar day depending on server timezone, unlike the existing Manila-pinned pattern in `src/domain/eta.ts` — status: confirmed, not fixed this pass
  6. `src/app/admin/orders/page.tsx:89` — `/admin/orders?userId=` with no `?tab=` silently ANDs an Ongoing-tier-only filter despite the "orders for `<name>`" label implying all orders; no current UI links to this URL shape, but it's a supported route and a real regression from pre-diff behavior — status: confirmed, not fixed this pass
  7. `src/lib/orders.ts:1338` — `requestOrderCancellation`'s failure catch hardcodes one `notificationLog` row to the customer template even though two emails were sent, mislabeling/losing the admin email's outcome — status: confirmed, not fixed this pass
  8. `src/actions/admin-actions.ts:222` (+ `src/actions/order-actions.ts:207`) — the two new cancellation actions are the only 2 of ~15 `auditLogSubject` call sites in the repo that don't `await` it — status: confirmed, not fixed this pass
  9. `src/components/admin/promo-code-form.tsx:103` — `useEffect`'s `onSaved` dependency is a fresh closure every render, and `wasSaved` never resets, so the dialog's own close animation re-fires it — a duplicate "Promo code updated" toast on every edit — status: confirmed, not fixed this pass
  10. `src/app/account/orders/[orderId]/loading.tsx:6` — still two generic unshaped `Skeleton` blocks, doesn't match the new "Pickup" `SectionCard` this diff added to `page.tsx` — CLAUDE.md loading-states violation — status: confirmed, not fixed this pass
  11. `src/actions/account-actions.ts:124` — `toggleWishlist`'s audit-log write ends in a bare `.catch(() => {})` with zero logging/fallback, despite a comment claiming parity with `transitionOrderStatus`'s hardening (which does log+record) — status: confirmed, not fixed this pass
  12. `src/lib/email-templates.ts:477` — `orderCreatedPaymentEmail`'s text body never calls `pickupTextBlock`, unlike 3 sibling lifecycle emails, though its own HTML body does call `pickupFact` — status: confirmed, not fixed this pass
  13. `src/lib/orders.ts:1297` — `OrderEmailInput` (and its failure-log block) is hand-built 3 times instead of one shared helper — the direct root cause of #4 — status: confirmed, not fixed this pass
  14. `src/components/store/price.tsx:59` — `Price`/`CatalogPrice`/`product-card.tsx`'s save-badge hardcode 3 separate classNames instead of the shared `overlay-pill.ts` primitive this same diff introduced (whose own doc comment names "save %" as in scope) — **recurrence of prior findings #3 and #5 from the 2026-09-18 review below**, still not fixed — status: confirmed, not fixed this pass
  15. `src/app/admin/orders/page.tsx:54` — the new admin-orders tab strip is copy-pasted character-for-character from `admin/promo/page.tsx`'s existing tab strip instead of a shared component — status: confirmed, not fixed this pass

  One candidate was investigated and refuted: a claim that removing the PDP product image's `max-h-[80vh] max-w-[80vh]` cap (`src/app/(store)/shop/[skuId]/page.tsx`) would push the buy box below the fold at 1366×768/1440×900 — refuted by loading the live dev server and confirming the `md:grid md:grid-cols-2` layout puts the image and buy box in separate side-by-side sticky columns, so a taller image cannot push the buy box down at those widths (only genuinely below the 768px breakpoint, which the claim didn't cover).

  **Backlog carried from the 2026-09-18 review, checked against this diff:**
  - `availableForPreOrder` duplication (#2, 2026-09-18) — fixed via a new shared `newSkuFulfillmentDefaults()` helper (`src/domain/product-type.ts`), used correctly by the Velixir full-bottle scripts and `seed.ts`; **3 new decant scripts added this same session** (`add-polo-black-decant.ts`, `add-shiyaaka-snow-decant.ts`, `add-velixir-icarus-decant.ts`) hardcode `fulfillment: "ON_HAND"` inline instead of using the new helper — not re-reported as one of the 15 above (didn't survive the severity cut), but worth a mention: the fix exists, adoption isn't yet complete.
  - Badge/border legibility patching `className` instead of the underlying token (#3, 2026-09-18) — **not fixed, recurred** — see finding #14 above.
  - Overlay pill/badge markup duplication (#5, 2026-09-18) — partially fixed: `src/components/store/overlay-pill.ts`'s `OVERLAY_PILL_CLASS` now exists and is correctly used for the rating/category pills at 3 call sites, but the save-badge specifically (named in its own doc comment) still isn't — see finding #14 above.
  - Brand-icon viewBox mismatch (#6, 2026-09-18) — not touched by this diff, not re-verified this pass, remains outstanding.
  - Badge sizing not scaling past 576px (#7, 2026-09-18) — not touched by this diff, not re-verified this pass, remains outstanding.
  - Contact/footer social-link duplication (#8, 2026-09-18) — **fixed this session**: `src/lib/social-links.ts` is now the single shared source for `store-footer.tsx` and `contact/page.tsx`, and `contact/loading.tsx` (the last holdout, previously hardcoding its own copy) was migrated to import from it too while fixing the Facebook/Instagram rebrand.
- **Checkpoint advanced to:** `748a30e14c39b6b642bcfd6f93fd86027741b9c6` (HEAD at review time).
