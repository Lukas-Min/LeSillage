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
