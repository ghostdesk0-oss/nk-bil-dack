# 0004: Drop the 3D car configurator; one booking engine for site and workshop

**Status:** accepted (supersedes 0003)
**Date:** 2026-11-23

## Context
Viktor's verdict after using it: "the car and the whole test-the-car thing is unnecessary fluff."
It cost a second WebGL context, about a third of the page length on a phone, and a scene that
had to take turns with the tyre to hold the frame rate. It did not sell anything the tyre and
the price list do not sell more directly.

At the same time, Verkstaden had grown two dashboards with two data models. The newer one never
received web bookings because it read the wrong storage shape.

## Options
1. Keep the car, polish it further.
2. Drop the car; keep the tyre as the one 3D moment; rebuild the page around booking.

## Decision
Option 2. The page is now hero (plate scan + tyre), the tyre story, a price board that books
in one tap, the shop, the tyre hotel and the visit block. All bookings, orders and carts go
through `src/engine.js`, which both the site (`app.js`) and Verkstaden (`admin.js`) use.

## Consequences
- One WebGL context. The "two lazy canvases" rule in 0003 no longer applies.
- The engine is pure logic and is unit-tested and fuzzed under Node (`tests/engine.test.mjs`).
  When a backend arrives (roadmap phase 2), the same functions move to the server.
- The car code is in git history (`src/car/car.js` before this commit) if it is ever wanted again.
