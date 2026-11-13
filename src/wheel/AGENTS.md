# src/wheel: tyre scene (hero and scroll story)

- The page owns where the wheel is: `pose()` in `app.js` returns screen position, size,
  angles and effects each frame; this module eases toward it. Change camera moves in `pose()`.
- Exports `tyreTextures`, `tyreProfile`, `softDisc`, `concrete`, `studioEnv` and the stud
  constants; the car module reuses them. Changing their signatures breaks the car.
- The canvas is fixed and full-viewport. Sections after the story need an opaque background
  and `z-index:3` to cover it.
- `.pin` is sticky and therefore its own stacking context. Layers that must sit behind the
  wheel (the ghost words) live outside it as fixed elements.
