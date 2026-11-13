# How AI agents work in this repo

The goal: every task leaves the repo a little smarter, so the next task (by any agent or
person) doesn't repeat the last one's mistakes. This is the "compound engineering" loop:
**plan → work → review → compound**.

## The four layers of memory

| Layer | File | What it holds | Who reads it |
| --- | --- | --- | --- |
| Rules | `AGENTS.md` (+ folder `AGENTS.md`) | Short, current instructions | Every agent, every session |
| Lessons | `docs/LESSONS.md` | Each mistake: what happened, the rule, how enforced | Agents before touching those files |
| Checks | `scripts/check.mjs`, `tests/smoke.py` | Lessons turned into code | Every build, every edit, CI |
| Decisions | `docs/decisions/` | Why we chose A over B | Anyone about to undo a choice |

Rules are advice. Checks are enforcement. A lesson starts as text and becomes a check the
second time it bites. That is how the repo gets more specialised over time: the checks
encode exactly the mistakes this codebase invites.

`CLAUDE.md` just imports `AGENTS.md` and adds Claude Code specifics, so Codex, Cursor and
Copilot read the same rules.

## The loop in practice

**Locally in Claude Code**
- `/plan <task>` reads the brief, roadmap and relevant lessons, then proposes a plan.
- Work. Hooks block edits to `dist/` and run the rules after every edit to `src/`; a broken
  rule is sent straight back to Claude to fix.
- `/ship` runs the tests, looks at screenshots, updates the changelog, runs `/compound`, commits.
- `/compound` turns the session's mistakes into lessons and checks.
- `/fix-issue 12` takes a GitHub issue from reproduction to commit, then compounds.
- `/lesson <what happened>` records one immediately.

**On GitHub**
- Every push and PR: build, rules, browser smoke test, screenshots kept as an artifact.
- Every PR: Claude reviews it against `docs/LESSONS.md` and proposes new lessons.
- `@claude` in an issue or PR comment: Claude works on it (owner and collaborators only).
- Every Monday: the Compound workflow reads the week's closed issues, merged PRs and failed
  runs, adds lessons, promotes repeat ones to checks, prunes `AGENTS.md`, and opens a PR.

**From the site itself**
- Uncaught errors on any device are logged in the browser and shown in Verkstaden → Logg,
  each with a "Skapa ärende" button that opens a prefilled bug issue.
- "Skicka feedback" there opens the Swedish feedback form for Nicklas.
- Phase 2 sends these to the backend automatically instead of waiting for a tap.

## One-time setup

1. In Claude Code, run `/install-github-app` for this repository, or add an
   `ANTHROPIC_API_KEY` secret under Settings → Secrets and variables → Actions.
   Until then the three Claude workflows skip themselves quietly.
2. Create labels `bug`, `feedback`, `feature` (the issue forms use them).
3. If the repo is renamed, update `REPO` in `src/app.js`.

## Keeping it healthy

- `AGENTS.md` stays under 120 lines. Bloated instruction files get ignored.
- A lesson without an enforcement path is a to-do. Prefer a check.
- Don't let agents merge their own PRs. Review is where lessons are found.
