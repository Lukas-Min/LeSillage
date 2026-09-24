# Code review checkpoint

**Last reviewed commit:** `748a30e14c39b6b642bcfd6f93fd86027741b9c6`
**Reviewed:** 2026-09-24
**Scope of that review:** diff since prior checkpoint (`cf769b6...748a30e`, 10 commits, 81 files)

The next code review should scope itself to `git diff 748a30e...HEAD` rather than the whole tree. 15 findings from this review were left unfixed and remain in scope for the next pass — most severe: a home-address privacy leak on receipt-less cancelled/rejected orders (`src/domain/pickup.ts`), a race condition letting an admin's cancellation Approve override a concurrent Deny (`src/lib/orders.ts`), pending cancellation requests silently bypassable via other admin action buttons, every PICKUP order's status emails wrongly saying "Promo applied" for free delivery, and `formatDate`/`formatDateTime` not pinned to Asia/Manila. See `LOG.md`'s 2026-09-24 entry for the full list of 15 plus the carried-over backlog from 2026-09-18 (two items fixed this pass — `availableForPreOrder` helper adoption and contact/footer social-link dedup — one recurred — badge `className` patching instead of a shared token/primitive — and two remain unverified: brand-icon viewBox mismatch, badge sizing past 576px).

Do not edit this by hand except to correct an error — it's updated automatically at the end of every code review (see `CLAUDE.md` → "Code review checkpoints (hard rule)").
