# src/car: car configurator

- Renders only while `#bygg` is near the viewport. `app.js` mounts it lazily; keep it lazy.
- The car exists twice: `real` and `mirror` (scale y -1) for the floor reflection. Anything
  you change per frame (spin, bounce, rims) must be applied to both, via `both`/`allWheels`.
- Materials and geometries are shared between the two cars and the four wheels. Swap
  meshes, don't clone materials, or memory grows on every swap.
- `setPad(top, bottom)` keeps the car in the free band between title and controls. Call it
  after anything changes the height of `.ctop` or `.cdock`.
- Body geometry is tessellated and welded in `shapeBody`. Without the weld the panels
  shade flat and look folded.
- The headless test browser runs at a few frames per second. Anything timed on `clock`
  (clamped to 50 ms per frame) will look unfinished in screenshots. See L-007.
