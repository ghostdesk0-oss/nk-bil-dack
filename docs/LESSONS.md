# Lessons

Mistakes already made in this repo, so no one makes them twice. Newest first.
Format: what happened, the rule, and how it is enforced (`check.mjs` rule ID, test, or "manual").
When a manual lesson bites a second time, turn it into a check.

## L-012 New elements inherit unintended styles and grid rows
**Happened:** an `href="#kontakt"` anchor matched the `#kontakt` ID selector (light background,
padding) and a hero link stretched tall because the hero grid's fixed template rows ran out and
implicit rows shared leftover space.
**Rule:** scope section styles to classes or check new elements against ID selectors; count grid
children against `grid-template-rows` when adding markup.
**Enforced:** manual.

## L-011 A throwing wait_for_function expression fails the test instantly
**Happened:** `wait_for_function("document.querySelector('.kpis').textContent...")` rejected with
"Cannot read properties of null" while the admin view was still rendering, instead of polling on.
**Rule:** guard every polled expression: `!!document.querySelector('.x') && ...`.
**Enforced:** manual.

## L-010 IntersectionObserver is useless on a fixed canvas
**Happened:** pausing the hero wheel with an IntersectionObserver on its canvas never fired,
because `#wheel` is `position:fixed` and always intersects the viewport.
**Rule:** gate the render loop on the sections the fixed canvas belongs to (hero + story),
not on the canvas element itself. Absolutely-positioned canvases like `#car` can be observed directly.
**Enforced:** manual.

## L-009 Wait for state, not for time, in browser tests
**Happened:** the smoke test clicked the dashboard 600 ms after a view transition. On the slow
test renderer the transition had not finished, the test failed, and the bug looked real.
**Rule:** wait for a selector or a condition (`wait_for_selector`, `wait_for_function`), not a timeout.
**Enforced:** `check.mjs` L-009 blocks a bare `wait_for_timeout` directly before an `assert` in `tests/smoke.py`.

## L-008 One file has a size budget
**Happened:** fonts, three.js and two scenes are inlined; the file passed 1 MB.
**Rule:** keep `dist/index.html` under 1 300 KB. Lazy-load or drop before adding.
**Enforced:** `check.mjs` L-008.

## L-007 Animations that must finish use wall-clock time
**Happened:** the rim swap was timed on the frame clock, which is clamped to 50 ms per frame.
On a slow device the swap stalled half-way and a wheel looked rimless.
**Rule:** time it with `performance.now()`. Use the frame clock only for continuous motion.
**Enforced:** `check.mjs` L-007 for the swap; manual elsewhere.

## L-006 Respect reduced motion
**Rule:** every animation has a reduced-motion path; 3D modules check `prefers-reduced-motion`.
**Enforced:** `check.mjs` L-006 (CSS block present); manual for JS.

## L-005 Don't invent facts about a real business
**Happened:** a brief asked for wet-grip and noise badges and "Balansering ingår". We had no
source for either.
**Rule:** show only sourced facts. Everything else is labelled as example data.
**Enforced:** `check.mjs` L-005 blocks tyre-label terms until real data exists.

## L-004 The demo says it is a demo
**Rule:** demo strip and `noindex` stay until consent and backend are live (Roadmap phase 3).
**Enforced:** `check.mjs` L-004.

## L-003 View transitions reject when interrupted
**Happened:** two quick view switches threw "Transition was skipped" as an unhandled rejection.
**Rule:** only call `startViewTransition` through `vt()`, which catches its promises.
**Enforced:** `check.mjs` L-003.

## L-002 Hover sticks on touch screens
**Happened:** buttons stayed highlighted after a tap on iPhone.
**Rule:** `:hover` only inside `@media(hover:hover)`; give touch an `:active` state instead.
**Enforced:** `check.mjs` L-002.

## L-001 Brand colours drift
**Happened:** a raw `#0B4EA2` and `#000` slipped into the CSS beside the tokens.
**Rule:** colours only as `:root` variables.
**Enforced:** `check.mjs` L-001.

## L-000 Design for the owner's actual screen
**Happened:** the first hero was taller than the iPhone viewport inside the Claude viewer;
the wheel slid over the text when scrolling.
**Rule:** test at 390x640 usable height. The hero, the configurator dock and the bottom bar
must all fit without overlap.
**Enforced:** `tests/smoke.py` runs at 390x760 and asserts the camera presets never overlap
the highway button (`.ccam` vs `#hwy` bounding boxes); manual elsewhere.
