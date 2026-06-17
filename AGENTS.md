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

Three things follow from this, and they're the part agents miss:

1. **A theme is a set of independent axes, not just a palette.** Themes vary along
   *color · elevation (box-shadow + inset-shadow) · radius · border-width ·
   spacing · type (family/size/weight/tracking/leading) · motion · effects
   (blur/gradient/text-shadow)*. Each is themed separately.
2. **A theme only changes what a component opts into.** If your card never writes
   a box-shadow token, the elevation axis can't touch it. If no heading uses
   `font-display`, the type-family axis is inert. "I used semantic colors" buys
   you *one* axis and leaves the other eight flat.
3. **The silent failures are the ones lint can't see.** Lint now catches the
   *mechanical* islands — palette/hex colors, baked `shadow-*`, off-scale
   `p-[18px]`, dead `*-opacity-N` — and autofixes most (§2). What's left is
   genuinely silent: a shadowless card under Neumorphic isn't an error, it just
   renders as a flat rectangle the same color as the page; an axis you never
   reference is inert; a pale fill's on-color washes out. Those don't fail loudly,
   so they accumulate — the fix is to *reference* the axes (below) and *look*
   under a stress theme (§8).

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
| **focus ring** (`focus-ring-width/-offset`) | `outline-2`, `outline-offset-2` | `focus-visible:[outline-style:solid] focus-visible:[outline-width:var(--focus-ring-width)] focus-visible:[outline-offset:var(--focus-ring-offset)] focus-visible:outline-focus-ring` |
| **icon stroke** (`icon-stroke-width`) | `strokeWidth="2"` (baked) | `[stroke-width:var(--icon-stroke-width)]` |

The complete, schema-generated list of escape-hatch tokens is in
[`docs/escape-hatches.generated.md`](docs/escape-hatches.generated.md).

**Three island types now fail lint, with autofix — you rarely hand-write the fix:**
`veneer/no-baked-shadow` rewrites the named `shadow-*`/`text-shadow-*` utilities →
`[box-shadow:var(--shadow-md)]`; `veneer/no-island-spacing` rewrites off-scale
`p-[18px]` → `p-4.5`; `veneer/no-dead-opacity` flags the dead-in-v4 `bg-opacity-*`
utilities. The other rows (border-width, duration, focus-ring, icon-stroke — and a
bare `opacity-50`) can't be caught safely by a class-string lint, so they stay on
you, backed by §8.

**Why shadows are special:** Tailwind v4's named `shadow-*` / `text-shadow-*`
utilities *bake their geometry at build time* (only the color is a runtime var),
so re-setting `--shadow-*` at runtime would not update them. The arbitrary-property
form `[box-shadow:var(--shadow-card)]` keeps them fully themeable.
`drop-shadow-*` is the exception — its utility already resolves `var(--drop-shadow-*)`,
so the `drop-shadow-lg` class is fine.

**Gradient text:** `bg-clip-text text-transparent bg-(image:--gradient-text)`.

**Motion:** durations are unitless numbers (ms), hence the `*1ms` in the calc.
Easings *are* utilities (`ease-default`, `ease-snappy`, `ease-smooth`, `ease-bounce`).

### Off-scale or opt-in? There's always a token form

The gotchas above are *wrong class*. The other failure is *no class* — reaching
for a bare value, or leaving an axis blank. There's a token form for every case,
so an island is never necessary:

| Want | ❌ Island / blank | ✅ Token form |
|---|---|---|
| off-grid spacing | `p-[18px]` | `p-4.5` (= `calc(var(--spacing)*4.5)`; any decimal) |
| card elevation | *(nothing)* or `shadow-md` | `[box-shadow:var(--shadow-card)]` |
| recessed well | *(nothing)* | `[box-shadow:var(--inset-shadow-sm)]` |
| color + alpha | `bg-x bg-opacity-75` (dead in v4 — renders opaque) | `bg-x/75` |
| display heading | `font-semibold` only | `font-display …` |

---

## 4. The semantic token vocabulary

Use these names — they describe *role*, not appearance. Full list with defaults:
`packages/theme/src/schema.ts` and `docs/schema-reference.md`.

> **Color utilities repeat the family.** The names below are *roles*; the Tailwind
> color class doubles the family — `text-text-muted` and `border-border` (**not**
> `text-muted` / `border`, which are undefined classes). `bg-*` and `rounded-*`
> don't double.

- **Color / brand:** `primary` (+ `-hover`, `-active`, `-subtle`), `accent`
  (+ `-hover`, `-active`, `-subtle`), and the status colors `success` / `warning` / `danger` /
  `info` (each + `-hover`, `-active`, `-subtle`), plus `focus-ring`.
  → `bg-primary`, `bg-primary-subtle`, `text-primary`, `bg-success`,
  `hover:bg-danger-hover`, `bg-danger-subtle`, `focus-visible:outline-focus-ring`.
- **Surfaces (a ladder):** `surface` (page) · `surface-raised` (cards/menus,
  sits *above*) · `surface-sunken` (wells, recedes) · `surface-hover` /
  `surface-active` (neutral interactive hover/press — rows, menu items, ghost
  buttons; decoupled from the `sunken` well) · `surface-overlay`
  (menus/modals) · `surface-inverse` · `overlay-backdrop` (scrim).
- **Text:** `text` (body), `text-muted`, `text-subtle`, `text-inverse`,
  `text-on-primary` (text on a primary fill), `text-on-accent` (text on an accent
  fill), and the per-status on-colors `text-on-success` / `text-on-warning` /
  `text-on-danger` / `text-on-info` (text on the matching status fill — each
  contrasts with *its* fill, not the page; `text-on-primary` is **not** reusable
  for accent or status fills).
- **Borders:** color `border` / `border-strong` / `border-subtle`; width
  `border-width-thin` / `-default` / `-thick`; focus-ring geometry
  `focus-ring-width` / `focus-ring-offset` (the `focus-ring` *color* is under
  Color/brand) — applied via the escape hatch in §3.
- **Radii:** `rounded-none` … `rounded-3xl`, `rounded-full`.
- **Type:** families `font-sans` / `font-serif` / `font-mono` / `font-display`;
  sizes `text-xs` … `text-9xl`; weights `font-thin` … `font-black`; line-height
  `leading-tight` … `leading-loose`; letter-spacing `tracking-tighter` …
  `tracking-widest`.
- **Spacing:** one base unit `--spacing`; the whole `p-*`/`gap-*`/`m-*` scale is
  `calc(spacing * n)`. Just use normal spacing utilities — a theme rescaling
  `--spacing` changes density everywhere. Off the standard scale? Use the decimal
  multiplier form (`p-4.5` → `calc(var(--spacing) * 4.5)`; any decimal works, e.g.
  `min-h-23`) — never a bare-px island like `p-[18px]`, which ignores `--spacing`
  and won't rescale with the theme.
- **Effects:** `blur-*` (feeds `blur-*` and `backdrop-blur-*`), `gradient-primary`
  / `-accent` / `-surface` / `-text`, `opacity-disabled` / `-overlay`,
  `icon-stroke-width` (SVG stroke weight, via `[stroke-width:var(--icon-stroke-width)]`).
- **Motion:** `duration-fast` / `-default` / `-slow`; `ease-*`.

To read a token value in JS/TS (e.g. for an inline `style` background swatch),
use `tokenValue(current, 'color-primary')` from `@offthegully/veneerui` — not a literal.

**Custom colors (open namespace).** Need a color the vocabulary above doesn't have
— gold/silver/bronze, a brand secondary, a chart series? Don't hardcode it and
don't overload a semantic token. Define a **`color-x-<slug>`** token (e.g.
`color-x-gold`) in your app's base theme and consume it as a `var()`:
`[color:var(--color-x-gold)]` or `bg-(--color-x-gold)` — **never** `text-(--color-x-gold)`
(`text-` is ambiguous in v4; use the `[color:…]` form, or `text-(color:--color-x-gold)`).
It's a real per-theme variable — themeable, re-skins on switch, and passes
`no-hardcoded-colors`. The base theme declares the palette; other themes may recolor
it; a theme that omits one falls back to the base value. Constraints: a valid CSS
color, no `var()`, ≤64 per theme. Consume custom colors via `var()`/utilities, not
`tokenValue`. See `docs/authoring-guide.md` §4.

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
- **On-colors contrast with their fill, not the page.** A pale `primary` needs
  *dark* `text-on-primary` (white text on a light button is the most common
  mistake). Each status fill has its own on-color — `text-on-success` /
  `-warning` / `-danger` / `-info` — so set each to contrast with *that* fill;
  the schema defaults are already tuned to the default fills (dark on the
  green/amber/sky, white on the red), so you only override where your fill's
  lightness flips the choice. `text-on-primary` is **not** inherited by the status
  fills — don't rely on one value covering all of them.
- **Themes are more than color** — `border-width-*`, `radius-*`, `shadow-*`, type,
  and motion carry most of a theme's character. Tint shadows with the text color,
  not pure black.

---

## 7. Repo map & where things live

- `packages/theme` — the `@offthegully/veneerui` runtime: `ThemeProvider`, `useTheme`,
  `applyTheme`, `tokenValue`, `defineTheme`, validation, the import pipeline, and
  `TOKEN_SCHEMA`. Public API: `packages/theme/src/index.ts`.
- `packages/cli` — the `veneerui` CLI (`init`, `add`) and the **registry** of
  copy-into-your-app components (`packages/cli/registry/`). Tailwind v4 doesn't
  scan `node_modules`, so UI is *copied* into a consuming app (shadcn-style), not
  imported.
- `apps/playground` — the dev harness / demo site. `src/components/` holds the
  rendered UI (`ProjectOverview`, `ThemeShowcase`, `ThemeSwitcher`, …).
- `packages/lint-core` — the shared `veneer/*` island rules (`no-hardcoded-colors`,
  `no-baked-shadow`, `no-island-spacing`, `no-dead-opacity`) and their detector
  (`detect.js`/`rule.js`), reused by `eslint-plugin-veneer` and the playground's lint config.
- `gallery/themes/<slug>/theme.json` — the canonical example themes.
- `docs/` — `authoring-guide.md`, `schema-reference.md` (generated), integration
  guides. `scripts/` — `generate-theme.ts`, `gen-builtin.ts`, `build-registry.ts`.
- **React Native / Expo** — `npm create veneerui --framework expo` scaffolds a
  Veneer-themed Expo app via **NativeWind v5**. The token rules in this guide are
  identical there: same utilities (`bg-primary`, `text-text`, `rounded-md`), same
  theme JSON, no hardcoded colors. The scaffolded templates live in
  `packages/setup-core/assets/expo/`. Setup: [`docs/expo.md`](docs/expo.md).

---

## 8. Verify under a stress theme (don't trust the default)

The built-in themes are each designed to *stress one axis* — so they're your
audit. After changing a view, render it under the themes below and confirm it
**visibly changes on the named axis**. If it looks identical to the default,
you're not expressing that axis — go back and reference its tokens.

| Theme | Stresses | If your view doesn't change, you're not expressing… |
|---|---|---|
| **Brutalist** | borders, hard shadows, radius=0, heavy weights, thick/flush focus ring, heavy icon stroke | border-width / shadow / radius / focus-ring / icon-stroke |
| **Neumorphic** | shadows only (`surface` ≈ `surface-raised`) | elevation — cards are invisible without a shadow token |
| **Editorial** | serif type, scale, leading, spacing, thin icon stroke | `font-display`/`font-serif`, type scale, leading, icon-stroke |
| **High Contrast** | border-width, radius, thick focus ring | border tokens / focus-ring |
| **Glassmorphic / Neon Arcade** | blur, gradient, text-shadow/glow | the effect axes |

Two traps these surface: on dark/neumorphic themes `surface-raised` is the same
as or lighter than `surface`, so a card must carry a **shadow**, not rely on
color to stand out; and each status fill needs its own legible on-color
(`text-on-success`/`-warning`/`-danger`/`-info`), so a pale `danger` or bright
`warning` with the wrong on-color is the contrast risk to watch.

## 9. Definition of done

A UI change isn't done until:

- [ ] no raw palette (`bg-blue-500`), hex/`rgb()`, or `*-opacity-N`;
- [ ] off-scale spacing uses the decimal multiplier (`p-4.5`), never `p-[18px]`;
- [ ] cards carry a `[box-shadow:var(--shadow-*)]` token; headings that should
      feel distinct use `font-display`;
- [ ] verified by eye under **≥2 stress themes** from §8 (always include the one
      that stresses the axis you touched).

Then run from the repo root:

```sh
npm run lint            # veneer/* island rules: color, baked shadow, off-scale spacing, dead opacity (most autofix)
npm run typecheck
npm test                # incl. conformance.test.ts (no islands + drastic re-skin)
```

If you changed tokens in `schema.ts`, also run `npm run gen:theme` and commit the
regenerated outputs. For a real visual check, `npm run dev` runs the playground
and you can switch themes (top-right / bottom-right picker) to confirm your
component re-skins across the gallery.

## 10. Releasing (publishing to npm)

Versioning and publishing are automated with [Changesets](https://github.com/changesets/changesets)
and GitHub Actions. The published packages are `@offthegully/veneerui`,
`veneerui`, `create-veneerui`, and `eslint-plugin-veneer`. The internal
`@veneerui/lint-core` / `@veneerui/setup-core` are `private` (bundled into the
CLIs by tsup) and are never published.

**When you open a PR that changes a published package:**

```sh
npm run changeset        # pick the affected packages + bump type, write a summary
git add .changeset && git commit
```

Commit the generated `.changeset/*.md` file with your PR. No changeset is needed
for docs-only or playground-only changes.

**What happens after merge to `main`** (`.github/workflows/release.yml`):

1. Changesets opens/updates a **"Version Packages"** PR that bumps versions and
   writes `CHANGELOG.md` entries for everything with a pending changeset.
2. Merging that PR triggers the publish: `npm run build` then
   `changeset publish`, which publishes only the changed packages to npm with
   **provenance**, and creates git tags + GitHub Releases.

Auth uses npm **Trusted Publishing (OIDC)** — there is no `NPM_TOKEN` secret.
Each package's trusted publisher (repo `offthegully/veneerui`, workflow
`release.yml`) must be configured once on npmjs.com before the first publish.
