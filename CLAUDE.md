# Working notes for this repo

Concept demo for NK Bil & Däck AB (tyre and car workshop, Brynäs, Gävle). Customer site
with a Three.js wheel, booking, tyre shop and a workshop view. Builds to one HTML file.

## Commands

- `npm run dev` builds on change and serves http://localhost:5173
- `npm run build` writes `dist/index.html`
- `npm test` runs `tests/smoke.py` against `dist/` (build first)

Always build and run the smoke test before committing. Screenshots land in `tests/shots/`.

## Layout

- `src/index.html` markup, `src/styles.css` styles, `src/app.js` page logic
- `src/wheel/wheel.js` the 3D scene. The page drives it through `pose()` in `app.js`
- Site copy is Swedish. Code, comments and commits are English

## Rules that have already cost a round of rework

- **Brand:** black and red from the van livery. Use the CSS variables in `:root`
  (`--red`, `--ember`, `--crimson`, `--candy`). No raw colour values outside `:root`.
- **Type:** Archivo, heavy italic expanded for display (`.d`). Yellowtail is used once.
- **No invented facts.** Real: address, phone, opening hours, founding year, Google rating,
  lyktpolering 1 500 kr. Everything else is example data and must stay labelled as such.
  Do not invent reviews, EU tyre-label values or vehicle data.
- **The demo strip stays** until there is a real backend. So does `noindex`.
- **Phone first.** The owner looks at this on an iPhone inside a viewer with ~640px of
  usable height. The hero must fit that, and nothing may sit under the fixed bottom bar.
- **Motion:** hover effects only inside `@media (hover:hover)`. Respect
  `prefers-reduced-motion`. The wheel canvas is fixed and full-viewport; sections after
  the scroll story need an opaque background and `z-index:3` to cover it.
- **Stacking:** `.pin` is sticky and therefore its own stacking context. Anything that
  must sit *behind* the wheel (the ghost words) lives outside it as a fixed layer.
