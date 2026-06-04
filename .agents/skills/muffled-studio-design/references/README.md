# muffled.studio — Design System

Solo software studio. Builds software, apps, and products. Run by Josh Batley.

> **Tagline.** We build things. Mostly software. Some of it ships.

## Sources

Logos in `assets/` (`logo-light.svg` on paper, `logo-dark.svg` on ink).

The voice, palette, type, and motif rules below come from the studio brief. Edit this file in [muffled.skills](https://github.com/muffled-studio/muffled.skills) when brand rules change.

## Index

```
README.md                  ← this file
assets/
  logo-light.svg           ← ink mark on paper (light surfaces)
  logo-dark.svg            ← paper mark on ink (dark surfaces)
```

There are no `ui_kits/` or `slides/` yet — no product surfaces or deck templates were provided.

---

## Content fundamentals

The voice is **dry, precise, direct, no fluff**. We use **"we"** (not "I", not "you"). No exclamation marks, ever. Sentences are short. Periods do the work.

**Casing.** Lowercase by default — including in product copy, labels, and most headings. Title-case only when a proper noun demands it. The brand is `muffled.studio`, lowercase, with the dot.

**Examples (in voice).**

- ✅ "we build things. mostly software. some of it ships."
- ✅ "we made a thing. it works. it's small."
- ✅ "shipped. tiny. useful."
- ❌ "We're so excited to announce…"  *(performative)*
- ❌ "You'll love how easy it is!" *(2nd-person, exclamation, hyperbole)*
- ❌ "Revolutionary new way to build apps" *(marketing slop)*

**Pronouns.** "we" for the studio. Avoid "you" — describe the thing, don't address the reader. If a sentence needs a subject, use "the app", "the thing", "this".

**Numbers and stats.** Only when real and useful. No vanity metrics, no charts-for-decoration.

**Punctuation.** Period > em-dash > comma. We don't use exclamation marks. We don't use semicolons unless prose demands it. Ellipses are fine, used literally.

**Emoji.** No.

**Vibe.** A workshop, not a showroom. Things are made here. The brand sounds like the back of a tool — stamped, terse, true.

---

## Visual foundations

### Palette
Two colors do almost all the work.

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#1A1A1A` | foreground on paper, background in dark mode |
| `--paper` | `#F5F5F5` | background, foreground on ink |
| `--u-red` | `#C0392B` | destructive, error, stop |
| `--u-green` | `#27AE60` | success, ship, go |
| `--u-amber` | `#D4830A` | warn, in-progress, hold |
| `--u-blue` | `#2471A3` | info, link, reference |

Utility colors are **functional**, never decorative. No gradients in surfaces. No tints "for warmth". Hierarchy comes from opacity stops on `--ink` (`/72`, `/56`, `/40`, `/24`, `/12`, `/06`) — there is no separate gray ramp.

### Type
Two families, two jobs.

- **Space Mono** — headings, eyebrows, code. Stamped and mechanical; it's the studio's voice on a sign. It ships **only 400 and 700** — don't ask it for in-between weights. Headings run 400; `h4`/`h5` and single-word emphasis run 700. Give it a hair of negative tracking at display sizes (`-0.02` to `-0.04em`); mono is wide, so don't crowd it.
- **Space Grotesk** — body, labels, UI copy, anything you actually read in quantity. Weights **300–700**; body is 400, labels 500, emphasis 600. Neutral tracking, `1.55` line-height for body.

The pairing is the point: mechanical mono headline, humanist grotesk underneath. Never set long body copy in the mono — it's a heading face. Never set a headline in the grotesk — that's the mono's job.

### Spacing
4px base unit. `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96`. We compose layouts from this scale. Nothing falls outside it.

### Radius
`6px` default. **Held loosely** — square corners (0px) are also fine where the shape feels stamped. `999px` is reserved for things that are genuinely round (avatars, status dots).

### Borders
**0.5px only.** Hairline. We don't have a 1px border. The rule is the rule. Color is `--ink-24` by default, `--ink-56` when the border is doing real separation work.

### Shadows
**None.** We don't ship a shadow system. Elevation is communicated by border, opacity, and order on the page. If a popover needs to feel above the page, give it a paper background, a 0.5px border, and let the surface beneath stay still.

### Backgrounds
Flat `--paper` or flat `--ink`. No images, no patterns, no textures, no gradients (except the subtle paint inside the logo itself, which is part of the mark and not used elsewhere). Full-bleed solids are fine. Generous whitespace is the texture.

### Animation
Two modes:

- **Drift** for transitions (mount, state change, theme swap). `220ms`, `cubic-bezier(0.4, 0, 0.2, 1)`. Calm, even.
- **Snap** for direct interactions (press, release, toggle). `90ms`, `cubic-bezier(0.2, 0, 0, 1)`. Crisp, no overshoot.

**Nothing bounces.** No spring overshoots. No wobble. No keyframed loops on UI chrome.

### Hover & press states
- **Hover.** Opacity drop to `0.6` on the affected element, or surface wash to `--ink-06`. No color shifts.
- **Press.** Opacity to `0.4`. No scale shrink, no transform — the brand stays still.
- **Focus.** 0.5px outline at `--ink-56`, offset 2px. Same in dark mode (paper).

### Cards & surfaces
A card is `--paper` (or `--ink`), 0.5px `--border`, radius `6px`, no shadow, padding from the 4px scale. That's the whole recipe. Internal hierarchy is type weight + size, not boxes inside boxes.

### Transparency & blur
We use opacity for ink hierarchy. We don't use backdrop-blur — it produces a glassy, decorative feel that isn't ours. If something must overlay content, use solid `--paper` (or `--ink`) with a 0.5px border.

### Imagery
No stock. No grain filters. If product imagery is needed it should look like the actual product — flat screenshots on flat surfaces, no device frames, no perspective tilts. Imagery is reference, not décor.

### Layout
Generous outer margins. Single-column when the content is reading; two-column when the content is comparing. We don't fill space we don't need.

---

## Iconography

The brand has **no icon font** and no proprietary icon set in this drop. The system is intentionally text-first — labels do most of the work that icons usually do.

When an icon is genuinely needed:

- **Use Lucide** (CDN: `https://unpkg.com/lucide@latest`). Stroke icons match the 0.5–1px hairline language. Use stroke width `1.5px` for visual parity with our 0.5px borders rendered at typical UI scale.
- **Icon size** comes from the 4px scale: 12, 16, 20, 24px. Match the cap-height of adjacent type.
- **Color.** Currentcolor only. Icons inherit `--fg-1`, `--fg-2`, or a utility hue. No multicolor icons.
- **Spacing.** A `var(--s-2)` (8px) gap between icon and label. Mono needs air; cramming an icon next to mono feels noisy.

> **⚑ Substitution flagged.** Lucide is a placeholder. If you have a custom icon set, swap it in and update this section.

**Emoji.** No. Don't use emoji as decoration or status.

**Unicode glyphs.** Allowed sparingly when they're literally the right character: arrows (`→ ← ↑ ↓`), bullets (`·`), checks/crosses inside utility chips (`✓ ✕`), the registered/copyright marks. Never as a substitute for a real icon.

**Logo.** The mark is a **cuboid body** (the `F5F5F5` block / `1A1A1A` block depending on theme), a **swappable crown** (the parallelepiped on top — this is the variable element across product subbrands), and **fading legs** (the gradient verticals trailing down). Two colors, ever. **Never displayed below 24px**. Maintain a clear-space margin equal to the cuboid's short side.

---

## The one rule

**less.**
