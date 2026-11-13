---
description: Turn this session's mistakes into lessons and checks
---
Look back over this session: errors, failed tests, rework, things the user corrected, and
anything that took two tries.

For each one:
1. Is it already in `docs/LESSONS.md`? If so and it happened again, it needs enforcing:
   add a rule to `scripts/check.mjs` (with the lesson ID) or a step to `tests/smoke.py`.
2. If it is new, add an entry at the top of `docs/LESSONS.md` with the next ID: what happened,
   the rule, how it is enforced. Prefer a check over "manual".
3. If it changes how anyone should work in this repo, add one line to `AGENTS.md` (or the
   folder's `AGENTS.md` if it only applies there). Keep `AGENTS.md` under 120 lines.

Then run `npm run check`. Report what you added in three lines or fewer. If nothing was
learned, say so and change nothing.
