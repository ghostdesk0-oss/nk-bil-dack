# 0003: Two WebGL canvases, the car one mounted lazily

**Status:** accepted
**Date:** 2026-11-13

## Context
The tyre scene is fixed behind the first screens; the car configurator lives in its own section.

## Options
1. One canvas and one renderer for both scenes.
2. Two canvases; the car mounts when its section comes near.

## Decision
Two canvases. Each scene stays simple, and the car costs nothing until it is about to be seen.
The tyre renderer stops drawing once it is off screen.

## Consequences
Two WebGL contexts exist on the page. Keep it at two.
