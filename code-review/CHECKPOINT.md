# Code review checkpoint

**Last reviewed commit:** `e0e5970f9aebfd1cdb5ef3c93dd1b9e344e30b93`
**Reviewed:** 2026-09-29
**Scope of that review:** `git diff 5c0e045...e0e5970` — stacked order and delivery promo codes, site-wide discount dates, account promo codes, checkout, and the admin form pages. The 2026-09-24 findings were already closed in the fix pass logged the same day.

The next code review should scope itself to `git diff e0e5970...HEAD`. Open from this pass: checkout does not re-check the site-wide discount inside the order transaction (`src/lib/orders.ts`); Enter in the checkout promo field places the order (`src/components/store/checkout-form.tsx`); account promo end dates show the exclusive boundary (`src/app/account/promo-codes/page.tsx`). Pill sizing past 576px was measured later and closed.

Do not edit this by hand except to correct an error — it's updated automatically at the end of every code review (see `CLAUDE.md` → "Code review checkpoints (hard rule)").
