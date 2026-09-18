# Code review checkpoint

**Last reviewed commit:** `cf769b6`
**Reviewed:** 2026-09-18
**Scope of that review:** diff since prior checkpoint (`f64b602...cf769b6`, 4 commits, 18 files)

The next code review should scope itself to `git diff cf769b6...HEAD` rather than the whole tree. Six findings from this review were left unfixed and remain in scope for the next pass: `availableForPreOrder` duplicated across 4 SKU-creation call sites, the badge-legibility fix patching `className` instead of the underlying `--border` token, duplicated overlay-badge markup (product-card.tsx/page.tsx/composition-canvas.tsx), a brand-icon viewBox mismatch in the footer/contact icon row, badge sizing not scaling past the 576px breakpoint, and contact/footer social-link duplication. See `LOG.md` for full detail on every review.

Do not edit this by hand except to correct an error — it's updated automatically at the end of every code review (see `CLAUDE.md` → "Code review checkpoints (hard rule)").
