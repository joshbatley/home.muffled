---
name: muffled-ui
description: Install and compose @muffled components from ui.muffled.studio. Use when adding registry components, wiring theme/tokens, forms, floating menus, or styling UI in a consumer app. Avoid editing pulled registry files; push fixes upstream to muffled.ui and keep project-specific changes in app code.
paths:
  - "components.json"
  - "**/*.tsx"
  - "**/globals.css"
  - "app/**/*.css"
---

# muffled.ui (consumer)

shadcn-compatible registry at [ui.muffled.studio](https://ui.muffled.studio/). Same CLI workflow as shadcn; different defaults (ink/paper, 0.5px borders, no shadows).

For full brand rules (colour, type, voice), also use the **muffled-studio-design** skill.

## Setup

Add the registry to `components.json`:

```json
"registries": {
  "@muffled": "https://ui.muffled.studio/r/{name}.json"
}
```

Install **theme first** — it merges tokens and Tailwind theme into your CSS and registers Space Grotesk / Space Mono:

```bash
bunx shadcn@latest add @muffled/theme
```

Then components as needed:

```bash
bunx shadcn@latest add @muffled/button
bunx shadcn@latest add @muffled/form
```

Catalog and docs: [ui.muffled.studio](https://ui.muffled.studio/) · manifest: [registry.json](https://ui.muffled.studio/registry.json)

Optional dark mode:

```bash
bunx shadcn@latest add @muffled/theme-provider
```

Wire `ThemeProvider` and the theme init script per the installed `theme-provider` file comments so `.dark` does not flash on load.

## After install

- **Tokens** live in the CSS file shadcn targets (usually `app/globals.css`). Prefer theme utilities (`border`, `text-muted-foreground`, `h-hairline`, `duration-drift`) — not `gray-*`, not arbitrary `border-[0.5px]`.
- **Aliases** come from the consumer project's `components.json`. Installed files land under your configured `ui` / `lib` paths; import from those aliases, not from `@/registry/*` unless your project uses the same layout as the docs site.
- **Dependencies** — registry items declare npm deps; let the CLI install them. Many components need `radix-ui`, `clsx`, `tailwind-merge`, etc.

## Composing UI

### Forms

Stack: `react-hook-form` + `zod` + `@hookform/resolvers/zod`.

```bash
bunx shadcn@latest add @muffled/form
```

Wire: `Form` → `FormField` → `FormItem` → `FormLabel` / `FormControl` / `FormDescription` / `FormMessage`.

- Labels: mono (`FormLabel`).
- Hints: grotesk `text-sm text-muted-foreground` on `FormDescription`.
- Errors: grotesk `text-sm text-destructive` on `FormMessage`; lowercase copy.
- Do not restyle inside `FormControl`; use `aria-invalid` on the slotted control.

### Floating surfaces

Menus, popovers, selects, and similar panels must match installed components. If you add a **new** floating surface, reuse the same surface helpers the registry ships (typically `floatingSurfaceClasses` from the installed `lib` / `utils` path after `surface` or equivalent is present):

- paper background, `border-border-strong`, `shadow-none`
- drift motion (`duration-[var(--d-drift)]`)
- no `backdrop-blur`, no box shadows

Dialogs/sheets use the modal surface pattern from the registry (`modalSurfaceClasses` where exported).

### Custom components

- Use `cn()` from the installed utils/surface module.
- Focus: `focus-visible:outline` at ink/56, 2px offset — do not invent a new ring colour.
- Hover/press: opacity 0.6 / 0.4 — no scale transforms on press.
- Icons: Lucide, stroke **1.5**, `currentColor`, sizes 12/16/20/24.

## Do not reintroduce

These break the system and fight installed components:

- `shadow-*` (except `shadow-none`)
- `gray-100` … `gray-900`
- 1px borders (`border-[1px]`, default `h-px` for hairlines — use `h-hairline` / `w-hairline`)
- `backdrop-blur`, `zoom-in-*` on chrome
- `opacity-50` for disabled (use `opacity-40`)

## Updating components

Re-run `bunx shadcn@latest add @muffled/<name>` to refresh a component. Diff carefully if you have local edits on generated files.

## Local edits vs upstream

Installed registry files are **copies** from [muffled.ui](https://github.com/muffled-studio/muffled.ui). Prefer not to edit them in the consumer app.

| Change | In consumer app | Upstream |
|--------|-----------------|----------|
| Project-only (props, layout, composition, app-specific wrappers) | Yes — edit your code, not the pulled file | Not needed |
| Bug fix, token/style alignment, accessibility, shared behaviour | Only if unavoidable; keep the diff minimal | **Yes** — fix in muffled.ui, then reinstall |

When you must patch a pulled component (fix or style update):

1. Make the smallest change that solves the problem.
2. Tell the user to **push the same fix upstream** to muffled.ui so the next `shadcn add` does not wipe it.
3. Do not refactor or restyle pulled files for convenience — wrap or compose in app code instead.

Do not treat consumer copies as the source of truth for the design system.

## Install this skill (Cursor + Claude)

```bash
bunx skills add muffled-studio/muffled.skills --skill muffled-ui -a cursor -a claude-code -y
```

List skills in this repo: `bunx skills add muffled-studio/muffled.skills --list`
