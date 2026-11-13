# 0002: Plain three.js, not React Three Fiber

**Status:** accepted
**Date:** 2026-11-13

## Context
A brief asked for React Three Fiber. The page is not a React app.

## Options
1. React + React Three Fiber.
2. Plain three.js modules driven by the page.

## Decision
Plain three.js. Same rendering, no React runtime to download, fewer moving parts.

## Consequences
Scene state is managed by hand (`pose()`, the car API). If the site becomes a React app
later, R3F is worth revisiting.
