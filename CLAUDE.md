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
