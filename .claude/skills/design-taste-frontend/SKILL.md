---
name: design-taste-frontend
description: tasteskill 2.5.1 (Leonxlnx/taste-skill), the anti-slop frontend build kit. Use when building or redesigning a website, landing page, shop, cafe, studio, SaaS or game site from scratch, or when a page looks generic or AI-made and needs rebuilding. For a review without rebuilding, use audit-ai-design-slop.
---

# tasteskill 2.5.1 (loader)

The kit is about 40 MB (a CSS system, a starter page, effects, photo and icon tools, and a finish
gate that checks the page in a real browser). This skill fetches it on first use instead of
carrying it.

## 1. Get the kit

```bash
KIT=.taste-skill/kit
if [ ! -f "$KIT/skills/taste-skill/SKILL.md" ]; then
  git clone --filter=blob:none https://github.com/Leonxlnx/taste-skill "$KIT" && git -C "$KIT" checkout -q 6c0b5c7
fi
```

`<skill>` in the kit's instructions means `$KIT/skills/taste-skill`. Keep `.taste-skill/` out of
git. The kit is pinned to commit `6c0b5c7` (22 Nov 2026); move the pin on purpose, never by default.
If GitHub cannot be reached, say so and stop. Do not rebuild the kit from memory.

## 2. Read it, then follow it

Read `<skill>/SKILL.md` in full and follow it: its references, deal scripts and finish gate. It
needs Node 22+ and Chrome or Chromium.

The upstream file also defines a Stop hook that runs its gate every time a session ends. This
loader leaves the hook out, so run the gate yourself at the end of the build
(`node <skill>/scripts/gate.mjs index.html`, step 6 upstream).

## 3. When the kit and the project disagree, the project wins

The kit assumes an invented business on a fresh page. Typical clashes:

- **Real client facts.** Upstream rule 9 hides house numbers and real phone numbers. On a page for
  a real client, the client's own address and phone stay as they are. Waive the gate's hit in
  `.taste-skill/waivers.json` with the reason "real client fact".
- **3D on a local business.** Upstream allows WebGL and effects on tech pages only. If the brief or
  the existing site already has a 3D centrepiece, keep it and waive with the brief as the reason.
- **Existing codebases.** Use the kit to plan, copy-check and audit sections. Do not replace
  working scenes, layouts or a project's own build and test setup with the kit's starter.
- **Project rules files** (`AGENTS.md`, `CLAUDE.md`) override the kit wherever they speak.

## Licence

The kit is MIT licensed, copyright (c) 2026 Leonxlnx. See `LICENSE` beside this file.
