# NK Bil & Däck

Concept site for NK Bil & Däck AB, a tyre and car workshop on Brynäs, Gävle: 3D tyre hero,
3D car configurator, booking, tyre shop, and a workshop dashboard. Builds to one HTML file.
The brief is `docs/PROJECT.md`, the plan is `docs/ROADMAP.md`.

## Commands

- `npm run dev` rebuilds on change, serves http://localhost:5173
- `npm run build` writes `dist/index.html`
- `npm run check` project rules (fast, no browser)
- `npm test` build, rules, then the browser smoke test

**Done means:** `npm test` passes, the change is in `CHANGELOG.md` under Unreleased, and any
lesson from the work is in `docs/LESSONS.md`. Look at screenshots in `tests/shots/` for UI work.

## Layout

- `src/index.html` markup, `src/styles.css` styles (tokens in `:root`), `src/app.js` page logic
- `src/wheel/` tyre scene, `src/car/` car configurator. Each has its own `AGENTS.md`
- `scripts/check.mjs` project rules as code. `tests/smoke.py` end-to-end walk
- `docs/LESSONS.md` mistakes already made, `docs/decisions/` why things are the way they are
- Never edit `dist/`; it is build output

## Rules

- **Copy is Swedish.** Code, comments, commits and docs are English.
- **Brand:** black and red from the van livery. Colours only through `:root` variables
  (`--red`, `--ember`, `--crimson`, `--candy`, ...). Display type is Archivo heavy italic (`.d`).
- **No invented facts.** Real: address, phone, hours, founding year 1993, Google 4.6/155,
  headlight polishing 1 500 kr. All else is example data and must say so. No made-up reviews,
  EU tyre-label values or vehicle data.
- **Phone first.** The owner looks at this on an iPhone with about 640 px of usable height.
  Nothing may sit under the fixed bottom bar.
- **Motion:** hover styles only inside `@media(hover:hover)`. Respect reduced motion.
  Animations that must finish are timed on `performance.now()`, never on the frame clock.
- **Keep the demo honest:** the demo strip and `noindex` stay until Phase 3 of the roadmap.

## How this repo learns

1. Before work: read `docs/LESSONS.md` entries that touch the files you will change.
2. After work, ask: what went wrong or took two tries? Write it to `docs/LESSONS.md`.
3. If a lesson can be checked by code, add a rule to `scripts/check.mjs` or a step to
   `tests/smoke.py`, and note the rule ID on the lesson. A checked lesson cannot repeat.
4. If a lesson changes how everyone should work, add one line here. Keep this file under
   120 lines: when you add a line, look for one that no longer earns its place.
5. A real choice between options gets an ADR in `docs/decisions/`.
