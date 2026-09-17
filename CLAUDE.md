@AGENTS.md

# Le Sillage project rules

These apply to every change in this repo (mirrors `.cursor/rules/document-changes.mdc` and `.cursor/skills/le-sillage-store/SKILL.md` for Cursor; see `.claude/skills/le-sillage-store/SKILL.md` and `.claude/agents/` for the full skill and the domain-reviewer / storefront-reviewer subagents).

## Document every change

Whenever you modify, add, or delete code, configuration, schema, content, or documentation, append a short single-line bullet to `CHANGELOG.md` under the current `[Unreleased]` section (`### Added`/`### Changed`/`### Fixed`/`### Security` as appropriate). Skip only for purely cosmetic whitespace/formatting or a changelog-only edit.

## Mobile-first

Every layout, typography, navigation, and interactive component must be built and tested at narrow viewports (360–414px) first, then enhanced for larger screens.

## Loading states

- Static page chrome (headers, titles, nav, copy that doesn't depend on a DB fetch) renders immediately — never wrap it in a skeleton.
- Only the regions that actually fetch data show a skeleton, and it must be shaped like the real content it's replacing (same grid, same card shape, same line counts) — not a generic spinner or unrelated placeholder.
- Route-level: every `page.tsx` doing server-side data fetching needs a matching `loading.tsx`.
- Same-route client interactions that re-fetch via search params (filter tabs, sort, pagination) need their own Suspense boundary keyed to the changing param, since `loading.tsx` alone does not retrigger for query-string-only navigation on the same route.

## Code review checkpoints (hard rule)

This repo tracks code-review coverage in `code-review/` (see `code-review/README.md`) so a review never re-scans the whole codebase — and re-burns tokens re-checking code already reviewed and found clean — when only recent changes need it. This rule applies whenever the repo is opened for review work, by any agent, whether invoked as `/code-review`, `/ultrareview`, or an ad hoc "review this" / "check for issues" request — not only when a review is explicitly named.

1. Before starting, read `code-review/CHECKPOINT.md` for the last-reviewed commit SHA.
2. Scope the review to `git diff <that-sha>...HEAD` — the changes since the checkpoint — instead of the whole codebase. Exceptions: no checkpoint exists yet (first run: full baseline, and say so in the log entry); the user explicitly asks for a full re-audit; or a specific PR/branch/path was named as the review target (that target's own scope wins over the checkpoint).
3. After the review finishes — findings reported, or none found — append an entry to `code-review/LOG.md` (date, commit range, effort level, areas covered, findings with a status: confirmed/fixed/plausible/skipped/no-issue) and update `CHECKPOINT.md` to the new HEAD SHA. Do this even with zero findings, so the checkpoint always advances and coverage is never silently lost between sessions.
