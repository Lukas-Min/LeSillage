# Code review tracking

This folder is Le Sillage's persistent code-review checkpoint. **It is not a test
suite** — automated tests live in `src/**/__tests__` and run with `npm test`.

It exists so a code review never re-scans the whole codebase from scratch and
re-burns tokens on code that was already reviewed and found clean:

- **`CHECKPOINT.md`** — the single commit SHA that marks "everything up to and
  including this commit has been reviewed." Updated automatically at the end
  of every review.
- **`LOG.md`** — the append-only history of every review run: date, commit
  range, scope, findings, and their outcome (confirmed/fixed/plausible/
  skipped/no-issue).

The enforcing rule lives in [`CLAUDE.md`](../CLAUDE.md) under **"Code review
checkpoints (hard rule)"** — read that for exactly when and how this folder
gets consulted and updated. In short: a review scopes itself to
`git diff <checkpoint-sha>...HEAD` instead of the whole tree, and always
advances the checkpoint when it finishes, even when it finds nothing.
