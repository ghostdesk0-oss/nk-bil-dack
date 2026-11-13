@AGENTS.md

## Claude Code in this repo

- Hooks in `.claude/settings.json` block edits to `dist/` and run `npm run check -- --quick`
  after every edit to `src/`. If a hook fails, fix the cause; do not work around the rule.
- Project commands: `/plan`, `/ship`, `/compound`, `/fix-issue <number>`, `/lesson <what happened>`.
- Run `/compound` at the end of any session that changed code.
