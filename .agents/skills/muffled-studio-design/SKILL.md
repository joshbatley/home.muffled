---
name: muffled-studio-design
description: Use when generating branded UI, HTML mocks, marketing surfaces, or when the user asks for muffled.studio look-and-feel. Not for shadcn registry install steps (use muffled-ui).
user-invocable: true
---

Read `references/README.md` in this skill first (vendored brand guide). Explore `references/assets/` for logos.

For static mocks and throwaway prototypes: copy assets from `references/assets/` and output standalone HTML the user can open. For production apps using `@muffled`, also load **muffled-ui** for install and compose rules.

Consumers get design tokens via `@muffled/theme` after install — do not point at paths in other repos. Token *concepts* are summarized below.

## Quick reference

- Two colours: ink `#1A1A1A`, paper `#F5F5F5`. Utility hues only when they mean something.
- Type: **Space Mono** for headings/eyebrows/code (400 + 700 only), **Space Grotesk** for body/labels/UI (300–700). Mechanical headline, humanist body.
- Spacing: 4px base unit.
- Radius: 6px default, held loosely.
- Borders: **0.5px only**. No 1px.
- Shadows: **none**.
- Motion: drift (220ms) for transitions, snap (90ms) for interactions. Nothing bounces.
- Voice: dry, precise, direct, "we", lowercase, no exclamation marks, no emoji.
- One rule: **less**.

## Files

```
references/README.md       · brand guide (read this first)
references/assets/         · logo-light.svg · logo-dark.svg
```

## Install this skill

```bash
bunx skills add muffled-studio/muffled.skills --skill muffled-studio-design -a cursor -a claude-code -y
```
