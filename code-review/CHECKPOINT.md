# Code review checkpoint

**Last reviewed commit:** `6c4c5fc137bdc2d9848e296d212567208b43d706`
**Reviewed:** 2026-10-06
**Scope of that review:** `git diff 4f39dd5...6c4c5fc` — per-type promo amounts, the account/admin layout rollout, New product's picker and Load details, the Archived tab and sold-out partials, the one-hour stock hold with its countdown and reminder, the 15-minute Worker schedule, the link-preview banner, and per-line promo cost on admin orders.

The next code review should scope itself to `git diff 6c4c5fc...HEAD`. Findings from that pass are in LOG.md and none were fixed in it; the two most important are open: `submitReceipt` can revive an order that was cancelled during the upload, and the one-hour auto-cancel can cancel an order whose receipt just arrived. Still open from before: checkout does not re-check the site-wide discount inside the order transaction; Enter in the checkout promo field places the order; account promo end dates show the exclusive boundary.

Do not edit this by hand except to correct an error — it's updated automatically at the end of every code review (see `CLAUDE.md` → "Code review checkpoints (hard rule)").
