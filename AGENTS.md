# Agent guide — building with Veneer

You are working in **Veneer**, a user-extensible theming system for Tailwind CSS
v4. This file tells you how to write and edit UI here so your code stays
themeable. Read it before touching any component.

If you only remember one thing: **never hardcode a visual value — drive
everything from theme tokens.** A component that bakes in `bg-blue-500` or
`#111827` is an "island" no theme can re-skin, and it will fail CI.

---

## 1. The core idea

The entire visual surface — color, type, spacing, borders, radii, shadows, blur,
motion — comes from one fixed set of **design tokens**. A *theme* is a small JSON
file that overrides some of those tokens; applying it writes CSS custom
properties to `<html>`, so the whole product re-skins instantly with no rebuild
and no React re-render. Anything a theme omits falls back to a schema default.

Components must therefore express every visual value through a **semantic token**
(a utility like `bg-primary` / `text-text-muted`, or `var(--token)`), never a
literal color or a raw Tailwind palette shade.

`packages/theme/src/schema.ts` (`TOKEN_SCHEMA`) is the **single source of truth**
for every token. `npm run gen:theme` regenerates the tokens CSS, JSON Schema, and
`docs/schema-reference.md` from it — never hand-edit those generated outputs.

---

## 2. The one hard rule: no hardcoded colors

Two gates enforce this and **fail CI** — the `veneer/no-hardcoded-colors` ESLint
rule and `apps/playground/src/conformance.test.ts`. They share one detector, so
they always agree. Three forbidden shapes:

| ❌ Don't | ✅ Do |
|---|---|
| `bg-blue-500`, `text-white`, `bg-black`, `text-red-600/50` (palette shades + bare black/white) | `bg-primary`, `text-text-on-primary`, `text-text-inverse` |
| `bg-[#fff]`, `text-[rgb(0,0,0)]`, `[color:#333]` (arbitrary color values) | a semantic utility, or `[color:var(--color-text)]` |
| `style={{ color: '#333' }}` (bare color literal in inline style) | `style={{ color: tokenValue(current, 'color-text') }}` or a className |

The **sanctioned escape hatch** is always a token reference: a semantic utility,
or `var(--token)` inside an arbitrary value (e.g.
`bg-[image:var(--gradient-primary)]`). Those are explicitly allowed.

For SVG, use `fill="currentColor"` / `stroke="currentColor"` so the icon inherits
the surrounding token-driven text color (see the GitHub mark in
`ProjectOverview.tsx`).

---

## 3. How tokens reach a component (read this — it's the non-obvious part)

Each token has a `bridge` in the schema that decides how you consume it:

- **`theme` bridge** — the token sits in a Tailwind v4 `@theme` namespace, so it
  generates a normal utility. Just use the class:
  `bg-primary`, `text-text-muted`, `rounded-md`, `text-5xl`, `font-display`,
  `font-black`, `leading-relaxed`, `tracking-tighter`, `blur-md` /
  `backdrop-blur-md`, `ease-snappy`, `drop-shadow-lg`.
- **`root` bridge** — no v4 namespace, so there's **no utility**. Consume it via
  `var()` in an arbitrary property or the `(--token)` shorthand.

### Gotchas where the obvious class is wrong

These are the cases agents get wrong most often. Use the right-hand form:

| Token group | ❌ Looks right but breaks theming | ✅ Correct |
|---|---|---|
| **box-shadow** (`shadow-*`, `inset-shadow-*`, `shadow-card`) | `shadow-md`, `shadow-card` | `[box-shadow:var(--shadow-md)]` |
| **text-shadow** (`text-shadow-*`) | `text-shadow-glow` | `[text-shadow:var(--text-shadow-glow)]` |
| **border-width** (`border-width-*`) | `border`, `border-2` | `[border-width:var(--border-width-default)]` (+ `border-border` for color) |
| **duration** (`duration-*`, unitless ms) | `duration-200` | `duration-[calc(var(--duration-default)*1ms)]` |
| **gradients** (`gradient-*`) | — | `bg-(image:--gradient-primary)` (or `bg-[image:var(--gradient-primary)]`) |
| **opacity** (`opacity-disabled/overlay`) | `opacity-50` | `opacity-(--opacity-disabled)` |

**Why shadows are special:** Tailwind v4's named `shadow-*` / `text-shadow-*`
utilities *bake their geometry at build time* (only the color is a runtime var),
so re-setting `--shadow-*` at runtime would not update them. The arbitrary-property
form `[box-shadow:var(--shadow-card)]` keeps them fully themeable.
`drop-shadow-*` is the exception — its utility already resolves `var(--drop-shadow-*)`,
so the `drop-shadow-lg` class is fine.

**Gradient text:** `bg-clip-text text-transparent bg-(image:--gradient-text)`.

**Motion:** durations are unitless numbers (ms), hence the `*1ms` in the calc.
Easings *are* utilities (`ease-default`, `ease-snappy`, `ease-smooth`, `ease-bounce`).

---

## 4. The semantic token vocabulary

Use these names — they describe *role*, not appearance. Full list with defaults:
`packages/theme/src/schema.ts` and `docs/schema-reference.md`.

- **Color / brand:** `primary` (+ `-hover`, `-active`, `-subtle`), `accent`
  (+ states), `success`, `warning`, `danger`, `info`, `focus-ring`.
  → `bg-primary`, `bg-primary-subtle`, `text-primary`, `bg-success`,
  `focus-visible:outline-focus-ring`.
- **Surfaces (a ladder):** `surface` (page) · `surface-raised` (cards/menus,
  sits *above*) · `surface-sunken` (wells, recedes) · `surface-overlay`
  (menus/modals) · `surface-inverse` · `overlay-backdrop` (scrim).
- **Text:** `text` (body), `text-muted`, `text-subtle`, `text-inverse`,
  `text-on-primary` (for text on a primary/accent/status fill).
- **Borders:** color `border` / `border-strong` / `border-subtle`; width
  `border-width-thin` / `-default` / `-thick`.
- **Radii:** `rounded-none` … `rounded-3xl`, `rounded-full`.
- **Type:** families `font-sans` / `font-serif` / `font-mono` / `font-display`;
  sizes `text-xs` … `text-9xl`; weights `font-thin` … `font-black`; line-height
  `leading-tight` … `leading-loose`; letter-spacing `tracking-tighter` …
  `tracking-widest`.
- **Spacing:** one base unit `--spacing`; the whole `p-*`/`gap-*`/`m-*` scale is
  `calc(spacing * n)`. Just use normal spacing utilities — a theme rescaling
  `--spacing` changes density everywhere.
- **Effects:** `blur-*` (feeds `blur-*` and `backdrop-blur-*`), `gradient-primary`
  / `-accent` / `-surface` / `-text`, `opacity-disabled` / `-overlay`.
- **Motion:** `duration-fast` / `-default` / `-slow`; `ease-*`.

To read a token value in JS/TS (e.g. for an inline `style` background swatch),
use `tokenValue(current, 'color-primary')` from `@veneer/theme` — not a literal.

---

## 5. Canonical component patterns

Copy these shapes (drawn from `ThemeShowcase.tsx` and `ProjectOverview.tsx`):

```tsx
// Primary button — color, radius, shadow (escape hatch), themed motion
<button className="inline-flex items-center justify-center rounded-md bg-primary
  px-4 py-2 text-sm font-medium text-text-on-primary [box-shadow:var(--shadow-sm)]
  hover:bg-primary-hover transition-colors
  duration-[calc(var(--duration-default)*1ms)] ease-default">
  Save
</button>

// Card — raised surface, themed border width + color, card shadow
<article className="rounded-lg border-border bg-surface-raised p-5
  [box-shadow:var(--shadow-card)] [border-width:var(--border-width-default)]">
  <h2 className="text-base font-bold text-text">Title</h2>
  <p className="text-sm text-text-muted">Body copy.</p>
</article>

// Gradient surface / clipped headline / disabled state
<div className="rounded-lg p-5 text-text-on-primary bg-(image:--gradient-primary)" />
<h1 className="bg-clip-text text-transparent bg-(image:--gradient-text)">Big</h1>
<button disabled className="bg-primary text-text-on-primary opacity-(--opacity-disabled)" />
```

Tip: hoist a shared `motion`/`interactive` class string to the top of the file
(as `ProjectOverview.tsx` does) instead of repeating the `duration-[calc(...)]`
incantation.

---

## 6. Authoring or editing a theme (the JSON side)

A theme is `gallery/themes/<slug>/theme.json` (or `packages/theme/src/builtin/*`):
metadata + a `tokens` object mapping token name → CSS value. Keep the `$schema`
line for editor autocomplete. Set only what differs from defaults.

Themes are **validated, not trusted** — a theme is *rejected* (never silently
degraded) if it uses an unknown token, an invalid CSS value, or any dangerous
pattern: `url()`, `@import`, `javascript:`, etc. Fonts may only name the bundled
allowlist (`ALLOWED_FONT_FAMILIES` in `schema.ts`) plus generic keywords — a theme
can never *load* a font.

Design pitfalls to respect (see `docs/authoring-guide.md`):

- **Surface ladder flips on dark themes:** on light, `surface-raised` is *lighter*
  than `surface`; on dark, raised is *lighter* too (light comes from above) while
  the page is darker — don't just invert a light theme by hand.
- **`text-on-primary` contrasts with the primary fill, not the page.** A pale
  primary needs *dark* `text-on-primary`. (White text on a light button is the
  most common mistake.)
- **Themes are more than color** — `border-width-*`, `radius-*`, `shadow-*`, type,
  and motion carry most of a theme's character. Tint shadows with the text color,
  not pure black.

---

## 7. Repo map & where things live

- `packages/theme` — the `@veneer/theme` runtime: `ThemeProvider`, `useTheme`,
  `applyTheme`, `tokenValue`, `defineTheme`, validation, the import pipeline, and
  `TOKEN_SCHEMA`. Public API: `packages/theme/src/index.ts`.
- `packages/cli` — the `veneer` CLI (`init`, `add`) and the **registry** of
  copy-into-your-app components (`packages/cli/registry/`). Tailwind v4 doesn't
  scan `node_modules`, so UI is *copied* into a consuming app (shadcn-style), not
  imported.
- `apps/playground` — the dev harness / demo site. `src/components/` holds the
  rendered UI (`ProjectOverview`, `ThemeShowcase`, `ThemeSwitcher`, …). The
  `veneer/no-hardcoded-colors` lint rule lives in `eslint-rules/`.
- `gallery/themes/<slug>/theme.json` — the canonical example themes.
- `docs/` — `authoring-guide.md`, `schema-reference.md` (generated), integration
  guides. `scripts/` — `generate-theme.ts`, `build-registry.ts`.

---

## 8. Definition of done

Before you consider a UI change complete, run from the repo root:

```sh
npm run lint        # incl. veneer/no-hardcoded-colors — fails on any island
npm run typecheck
npm test            # incl. conformance.test.ts (no islands + drastic re-skin)
```

If you changed tokens in `schema.ts`, also run `npm run gen:theme` and commit the
regenerated outputs. For a real visual check, `npm run dev` runs the playground
and you can switch themes (top-right / bottom-right picker) to confirm your
component re-skins across the gallery — verify against a wide-font theme
(Terminal, Monospaced) and a serif theme (Editorial), not just the default sans.
