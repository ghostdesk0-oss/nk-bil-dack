# src/wheel: tyre scene (hero and scroll story)

- The page owns where the wheel is: `pose()` in `app.js` returns screen position, size,
  angles and effects each frame; this module eases toward it. Change camera moves in `pose()`.
- `app.js` checks for WebGL before calling `mount`, and tells the scene when it is visible
  (`setVisible`). The smoke test's perf suite counts draw calls: zero when scrolled away.
- The canvas is fixed and full-viewport. Sections after the story need an opaque background
  and `z-index:3` to cover it.
- `.pin` is sticky and therefore its own stacking context. Layers that must sit behind the
  wheel (the ghost words) live outside it as fixed elements.
