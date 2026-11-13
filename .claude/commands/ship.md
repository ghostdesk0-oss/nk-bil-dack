---
description: Verify, document and commit the current change
---
Ship the current change.

1. Run `npm test`. If anything fails, fix the cause and run it again.
2. Look at the screenshots in `tests/shots/` that cover what changed. Fix what looks wrong.
3. Add a line under `## Unreleased` in `CHANGELOG.md`, in plain words a customer or Nicklas
   would understand where it is visible to them.
4. Run `/compound` for this change.
5. Commit with a message that says what changed and why. Don't push unless asked.
