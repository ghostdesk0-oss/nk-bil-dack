---
description: Plan a change before writing code
argument-hint: what to build or fix
---
Plan this change: $ARGUMENTS

1. Read `docs/PROJECT.md`, the relevant part of `docs/ROADMAP.md`, and every entry in
   `docs/LESSONS.md` that touches the files you expect to change.
2. Read those files, and any `AGENTS.md` in their folders.
3. Write a short plan: what changes, in which files, how you will verify it (which `npm test`
   steps, which screenshots at 390x760 and 1440x900), and which lessons apply.
4. If the plan makes a real choice between options, draft an ADR in `docs/decisions/`.
5. Stop and show the plan. Don't write code until it is approved.
