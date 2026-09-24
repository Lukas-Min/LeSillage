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
