# 0001: Ship the demo as one self-contained HTML file

**Status:** accepted
**Date:** 2026-11-13

## Context
The demo is shown to the owner on a phone, through a Claude page link, and may be sent on.
Those hosts allow inline scripts and data URIs but block most external requests.

## Options
1. One HTML file with fonts, styles, three.js and app code inlined.
2. A normal multi-file static site.

## Decision
One file. It opens anywhere, from any host, with no broken requests.

## Consequences
The file is large (about 1 MB) and has a size budget (L-008). When the real site moves to a
normal host in Phase 2, split it and load the 3D code on demand.
