@AGENTS.md

# Le Sillage project rules

Claude Code and Cursor follow the same project rules. The text lives in `.cursor/rules/` (Cursor applies those files directly). This file imports them so Claude Code loads the same text. Do not restate the rules here.

@.cursor/rules/document-changes.mdc
@.cursor/rules/code-review-checkpoints.mdc
@.cursor/rules/mobile-first.mdc
@.cursor/rules/loading-states.mdc
@.cursor/rules/empty-states.mdc
@.cursor/rules/no-agent-commit-trailers.mdc
@.cursor/rules/new-item-form-page.mdc
@.cursor/rules/email-types.mdc

The store skill is the same file at `.cursor/skills/le-sillage-store/SKILL.md` and `.claude/skills/le-sillage-store/SKILL.md`. The domain-reviewer and storefront-reviewer bodies are the same in `.cursor/agents/` and `.claude/agents/`. The one difference is the read-only switch each tool understands: Cursor uses `readonly: true`, Claude Code uses `tools: Read, Grep, Glob`.
