---
description: Fix a GitHub issue end to end
argument-hint: issue number
---
Fix GitHub issue #$ARGUMENTS.

1. Read it with `gh issue view $ARGUMENTS --comments`.
2. Reproduce it: write the failing check or smoke-test step first if you can.
3. Fix the cause, not the symptom. Read the `docs/LESSONS.md` entries for the files involved.
4. Run `/ship`. Reference the issue in the commit message (`Fixes #$ARGUMENTS`).
5. Run `/compound`: a bug that reached an issue is a lesson by definition.
