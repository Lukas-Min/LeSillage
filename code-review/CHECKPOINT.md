# Code review checkpoint

**Last reviewed commit:** `4f39dd58d46041287139523d018359c614d06a48`
**Reviewed:** 2026-09-30
**Scope of that review:** `git diff e0e5970...4f39dd5` — newsletter double opt-in, one-click unsubscribe, the marketing email queue, promo codes limited to chosen customers, and this session's storefront redesign (search, homepage, product grid and cards, All tab and stock filter, header Shop menu, three-column page size, sort tie-break, rail arrows).

The next code review should scope itself to `git diff 4f39dd5...HEAD`. Open from this pass (see LOG.md): Safari can lose Shop-menu card clicks (`src/components/store/shop-menu.tsx`); confirmed newsletter sign-ups matching an unverified account get no email (`src/domain/marketing.ts`); promo-code emails ignore the code's dates (`src/actions/admin-promo-code-actions.ts`); a crashed marketing run can re-send (`src/lib/marketing-queue.ts`). Still open from 2026-09-29: checkout does not re-check the site-wide discount inside the order transaction; Enter in the checkout promo field places the order; account promo end dates show the exclusive boundary.

Do not edit this by hand except to correct an error — it's updated automatically at the end of every code review (see `CLAUDE.md` → "Code review checkpoints (hard rule)").
