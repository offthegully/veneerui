# Veneer

**A user-extensible theming system for Tailwind CSS v4.** The entire visual
surface of an app — color, typography, spacing, borders, radii, shadows, blur,
and motion — is driven by a fixed set of design **tokens**. A *theme* is a small
JSON file that overrides some of those tokens. Switching is instant (one DOM
write, no re-render), users can import and author their own themes, and themes
are treated as **inert data, not code**, so they're safe to load from untrusted
sources.

There is no server and no account. A user's theme library lives entirely in their
browser's `localStorage`.

```
 Gallery (public JSON files)  ──import──▶  Library  ──enable──▶  Enabled  ──select──▶  Current
   browse / download / paste URL          everything           switcher subset      applied now
                                          you "own"
```

---

## Table of contents

- [How it works](#how-it-works)
- [Setup](#setup)
- [Usage](#usage)
  - [Switching themes](#switching-themes)
  - [Importing a theme](#importing-a-theme)
  - [Authoring your own theme](#authoring-your-own-theme)
  - [The gallery](#the-gallery)
- [The token schema](#the-token-schema)
- [Architecture](#architecture)
- [Security model](#security-model)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Testing & quality](#testing--quality)
- [Status & roadmap](#status--roadmap)
- [Further reading](#further-reading)

---

## How it works

Four ideas carry the whole system:

1. **A theme is a JSON document** mapping token names to CSS values
   (`"color-primary": "#3b82f6"`, `"radius-md": "8px"`). It contains no CSS, no
   scripts, no markup. Any token it omits falls back to a schema default, so a
   theme only sets what it wants to change.

2. **The token schema is the contract.** `src/theme/schema.ts` is the single
   source of truth — the canonical list of every value a theme may set (name,
   type, category, default, description). Theme authors target it; components
   consume it through Tailwind utilities. The two never share a vocabulary
   directly — they share the schema.

3. **Tailwind v4 is the rendering layer.** Tokens are declared in Tailwind's
   `@theme` block, which emits both a CSS custom property *and* a utility class
   (`--color-primary` → `bg-primary`, `--radius-md` → `rounded-md`). Components
   use only those semantic utilities; they never inline a hex code.

4. **Applying a theme just writes CSS variables.** `applyTheme()` sets the
   tokens as inline custom properties on `<html>`, which outrank the `:root`
   defaults in the cascade. Every Tailwind utility instantly reflects the new
   value — no component re-renders, only the variables change.

A user's themes move through four states — **Library** (everything you own),
**Enabled** (the subset shown in the switcher), and **Current** (the one applied
now) — fed by an external **Gallery** of shareable JSON files. Hoarding themes in
your library never clutters your switcher.

---

## Setup

**Prerequisites:** Node 20+ and npm.

```sh
git clone <repo-url> veneer
cd veneer
npm install
npm run dev          # http://localhost:5173
```

That's it — the app starts with five built-in themes and the import/preview flow
ready. To produce a production build:

```sh
npm run build        # regenerates token artifacts, typechecks, and bundles to dist/
npm run preview      # serve the build locally
```

---

## Usage

### Switching themes

Click the theme switcher in the top-right. It lists your **enabled** themes with
preview swatches; selecting one applies it instantly and persists the choice. On
reload, a tiny synchronous script in `index.html` re-applies your saved theme
*before* the app loads, so there's no flash of the default.

### Importing a theme

The switcher's **Manage themes** link opens the import panel. Two ways in:

- **Drop or pick a `theme.json` file** (saved with `source: "custom"`), or
- **Paste a raw URL** — e.g. a `raw.githubusercontent.com` link — and click
  **Fetch** (saved with `source: "imported"`, recording the source URL).

Either way the file is validated locally, then applied as a **live preview**: a
persistent banner appears ("Previewing untested theme: …") while you judge it on
the real UI.

- **Save to library** keeps it and makes it current.
- **Stop preview** discards it and restores your previous theme.

Nothing is uploaded, and an invalid or unsafe theme is rejected with a readable
error list before it can touch the page.

### Authoring your own theme

No in-app editor — you author JSON in your own editor and preview it in the app.

1. Copy the gallery file closest to your goal (start from `clean-light`).
2. Keep the `$schema` line for autocomplete and inline validation in VS Code.
3. Edit token values. Anything you omit uses the default.
4. Drop the file into **Manage themes** to preview; iterate; **Save**.

A minimal theme only needs the three required tokens:

```json
{
  "$schema": "https://veneer.app/schemas/theme-v1.json",
  "name": "Midnight Oak",
  "description": "Warm dark theme with amber accents",
  "author": { "id": "jane", "name": "Jane" },
  "version": "1.0.0",
  "schemaVersion": 1,
  "tags": ["dark", "warm"],
  "license": "MIT",
  "tokens": {
    "color-primary": "#d4a574",
    "color-primary-hover": "#b8895a",
    "color-surface": "#1a1612",
    "color-surface-raised": "#2a221c",
    "color-text": "#f5e6d3",
    "color-text-muted": "#a89684",
    "color-border": "#3d3027"
  }
}
```

See the **[authoring guide](./docs/authoring-guide.md)** for how to pick a
coherent palette (the light/dark surface flip, the `text-on-primary` trap,
contrast minimums, common pitfalls) and the generated
**[token reference](./docs/schema-reference.md)** for every token you can set.

### The gallery

Eight ready-to-use example themes live in **[`gallery/`](./gallery/README.md)**,
each a fully-realized, distinct design language (also the best starting templates
for authoring):

| Theme | Style |
|---|---|
| **Clean Light** | Conservative neutral baseline — fork this first |
| **Midnight** | Proper dark theme (raised surfaces lighter than base) |
| **Brutalist** | Thick black borders, 0 radii, hard offset shadows, display type |
| **Neumorphic** | Soft extruded UI carved from paired light/dark shadows |
| **Glassmorphic** | Translucent frosted panels, backdrop blur, gradient accents |
| **Editorial** | Serif display, enlarged type scale, magazine rhythm |
| **High Contrast** | Black-on-white accessibility theme |
| **Sunset Paper** | Warm cream paper, sunset gradient, playful motion |

Each theme ships with a `notes.md` explaining *why* its values were chosen. To
contribute one, see **[gallery/CONTRIBUTING.md](./gallery/CONTRIBUTING.md)**.

---

## The token schema

The v1 schema is **83 tokens**, sized to allow genuinely different design
languages (brutalist, neumorphic, editorial, …) rather than just recolored
variants. It's defined once in `src/theme/schema.ts`; `npm run gen:theme`
generates everything downstream so nothing drifts:

- `src/theme/tokens.generated.css` — the Tailwind `@theme` / `:root` defaults
- `public/schemas/theme-v1.json` — the published JSON Schema for `$schema`
- `docs/schema-reference.md` — the human-readable token reference

| Category | Count | Examples |
|---|---:|---|
| Colors | 12 | `color-primary` (+ hover/active/subtle), `color-accent`, status colors, `color-focus-ring` |
| Surfaces | 6 | `color-surface`, `-raised`, `-sunken`, `-overlay`, `-inverse`, `-overlay-backdrop` |
| Text | 5 | `color-text`, `-muted`, `-subtle`, `-inverse`, `-on-primary` |
| Borders | 6 | `color-border` (+ strong/subtle), `border-width-thin`/`-default`/`-thick` |
| Radii | 7 | `radius-none` … `radius-2xl`, `radius-full` |
| Shadows | 8 | `shadow-sm`…`-xl`, `inset-shadow-sm`/`-lg`, `shadow-glow`, `shadow-card` |
| Typography | 25 | `font-sans`/`-serif`/`-mono`/`-display`, `text-xs`…`-6xl`, `font-weight-*`, leading/tracking |
| Spacing | 1 | `spacing` — one base unit that rescales the whole density |
| Effects | 6 | `blur-sm`/`-md`/`-lg`, `gradient-primary`, `opacity-disabled`/`-overlay` |
| Motion | 7 | `duration-fast`/`-default`/`-slow`, `ease-default`/`-snappy`/`-smooth`/`-bounce` |

Each token records a **bridge**: `theme` tokens sit in a Tailwind v4 namespace and
generate a utility (`bg-primary`, `rounded-md`); `root` tokens have no namespace
(border widths, durations, opacities, gradients) and are consumed via `var()` or
arbitrary utilities like `duration-[calc(var(--duration-default)*1ms)]`. Both are
overridden the same way at runtime.

**Required tokens:** `color-primary`, `color-surface`, `color-text`.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Theme runtime (src/theme)                                │
│   • schema.ts        single source of truth (83 tokens)   │
│   • applyTheme()     writes CSS vars to <html>            │
│   • ThemeProvider    library/enabled/current + preview    │
│   • storage.ts       localStorage persistence (no server) │
│   • validate.ts      isomorphic 3-layer validation        │
│   • import-theme.ts  file/URL → validate → preview        │
├──────────────────────────────────────────────────────────┤
│  Tailwind CSS v4                                          │
│   • @theme: tokens → CSS variables + utility classes      │
├──────────────────────────────────────────────────────────┤
│  Browser                                                  │
│   • CSS custom-property cascade                           │
│   • inline style on <html> overrides :root defaults       │
└──────────────────────────────────────────────────────────┘
```

The only boundary between the theme runtime and Tailwind is the set of CSS
variable names in the schema: Tailwind reads them, the runtime writes them.
Neither knows the other's internals, so a component refactor never breaks themes
and a new theme never requires a component change.

**Anti-flash on load.** A self-contained script in `index.html` reads the
persisted library from `localStorage` and applies the current theme's tokens
before any module loads — the same technique every dark-mode implementation uses.

---

## Security model

Because themes can be loaded from untrusted sources, validation
(`src/theme/validate.ts`) is the security boundary. It's pure and isomorphic — the
same logic runs in the browser (via `CSS.supports`), in Node/CI (via `css-tree`),
and at three points: on contribution (gallery CI, Phase 4), on import, and on
apply.

A theme is rejected outright — never silently degraded — if it fails any of:

- **Structure** — must match the published JSON Schema; `schemaVersion` must be
  supported.
- **Known tokens** — unknown token names are dropped; required tokens must be
  present.
- **Valid CSS values** — every value is checked against the CSS grammar for its
  type (a `color` must be a real color, a `shadow` a real `box-shadow`, …).
- **No dangerous patterns** — `url()`, `@import`, `javascript:`, `expression()`,
  and the characters `; { } < >` are forbidden even if they'd parse as valid CSS.

**Fonts: themes name them, the app loads them.** Since `url()` is banned, a theme
can't ship a font — it may only *name* one the app bundles (Inter, Source Serif 4,
JetBrains Mono, Fraunces, Archivo Black) plus CSS generic keywords. Naming
anything else is rejected, so a theme can never silently fall back to a broken
look. The bundled fonts are loaded in `src/main.tsx`.

Because a theme can only set declared CSS variables — which are then consumed by
utilities already in the compiled CSS — there is no path from a theme to new CSS
rules, modified HTML, or executed code. The schema is the entire attack surface,
and it's narrow and validated.

---

## Project structure

```
veneer/
├─ src/
│  ├─ App.tsx                  App shell: header + showcase + preview banner
│  ├─ main.tsx                 Entry; loads bundled fonts, mounts ThemeProvider
│  ├─ index.css                Tailwind import + generated tokens + base layer
│  └─ theme/
│     ├─ schema.ts             ★ single source of truth — the 83-token TOKEN_SCHEMA
│     ├─ types.ts              Theme, ThemeLibrary, TokenDef, SCHEMA_VERSION
│     ├─ apply.ts              applyTheme() — writes CSS vars, reconciles defaults
│     ├─ validate.ts           validateTheme() — the security boundary
│     ├─ value-check.{ts,browser,node}.ts   isomorphic per-type CSS checking
│     ├─ storage.ts            localStorage load/save + defensive reconciliation
│     ├─ theme-context.ts      ThemeContext + useTheme()
│     ├─ ThemeProvider.tsx     library/enabled/current/preview state owner
│     ├─ import-theme.ts       parse + validate + provenance (file / URL)
│     ├─ ThemeSwitcher.tsx     switcher dropdown + Manage themes entry
│     ├─ ImportPanel.tsx       import modal (drop zone + raw URL)
│     ├─ PreviewBanner.tsx     live-preview banner (Save / Stop)
│     ├─ ThemeShowcase.tsx     token-driven demo surface
│     ├─ tokens.generated.css  ⚙ generated @theme / :root defaults
│     ├─ builtin/              5 built-in themes (light, dark, high-contrast, …)
│     └─ *.test.ts             validation, storage, conformance, gallery, import
├─ eslint-rules/
│  ├─ detect-hardcoded-colors.js   shared color detector
│  └─ no-hardcoded-colors.js       custom ESLint rule (lint + conformance share it)
├─ scripts/
│  └─ generate-theme.ts        ⚙ regenerates CSS / JSON Schema / token reference
├─ gallery/                    8 example themes (+ notes), becomes a GitHub repo in Phase 4
│  ├─ themes/<slug>/{theme.json, notes.md}
│  ├─ README.md  CONTRIBUTING.md
├─ docs/
│  ├─ authoring-guide.md       conceptual authoring guide (hand-written)
│  └─ schema-reference.md      ⚙ generated token reference
├─ public/schemas/theme-v1.json  ⚙ generated, published JSON Schema
├─ theme-system-overview.md            design doc: architecture & mental model
└─ theme-system-implementation-plan.md design doc: phased plan

★ = source of truth   ⚙ = generated (do not edit by hand)
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `gen:theme` → `tsc -b` → `vite build` |
| `npm run gen:theme` | Regenerate CSS / JSON Schema / token reference from `TOKEN_SCHEMA` |
| `npm run lint` | ESLint, including the `veneer/no-hardcoded-colors` rule |
| `npm run typecheck` | `tsc -b` |
| `npm test` | Vitest (validation, storage, conformance, gallery, import) |
| `npm run preview` | Serve the production build |

---

## Testing & quality

`npm test` runs **54 tests** across 7 files: theme validation, schema
expressiveness, storage reconciliation, built-in and gallery theme validity, the
import pipeline, and conformance.

Two mechanisms keep the app fully themeable — the contract that components use
*only* semantic token utilities, never hardcoded colors:

- **Lint rule** (`veneer/no-hardcoded-colors`) fails CI on palette utilities
  (`bg-blue-500`), arbitrary color values (`bg-[#fff]`), and inline color styles.
  The sanctioned escape hatch — a token utility or `var(--token)` — passes.
- **Conformance test** statically proves the rendered UI has no hardcoded color
  islands, and asserts a drastic theme (`high-contrast`) moves color *and*
  structure (border-width, radius, shadow) off the baseline — i.e. switching
  themes re-skins 100% of the UI.

Every shipped built-in and gallery theme is run through the real validator in
tests, so an invalid value or a typo'd token name fails the build rather than
becoming a dead override at runtime.

---

## Status & roadmap

Built and verified: **Phase 0** (schema, types, isomorphic validation,
generators, bundled fonts) · **Phase 1** (runtime, provider, anti-flash switcher,
5 built-in themes, persistence) · **Phase 2** (adoption lint rule + conformance) ·
**Phase 3** (local authoring & import: preview/import UI, 8 gallery themes, guides).

Planned:

- **Phase 4 — Gallery (GitHub).** Publish `gallery/` as a public repo with a CI
  Action running `validateTheme()` on every PR, and an optional GitHub Pages
  browse site. (The switcher's "Browse gallery" link is a placeholder until then;
  import-by-URL already works today.)
- **Phase 5 — Library curation.** A management UI for enable/disable, reorder, and
  remove across a large library, plus an optional update check against a theme's
  `sourceUrl`. (The underlying `setEnabled`/`removeTheme` operations already exist
  in the provider.)

---

## Further reading

- **[theme-system-overview.md](./theme-system-overview.md)** — full architecture
  and mental model.
- **[theme-system-implementation-plan.md](./theme-system-implementation-plan.md)**
  — the phased implementation plan.
- **[docs/authoring-guide.md](./docs/authoring-guide.md)** — how to author a
  coherent theme.
- **[docs/schema-reference.md](./docs/schema-reference.md)** — every token (generated).

## Stack

React 19 · Vite 8 · TypeScript · Tailwind CSS v4 · Vitest · ESLint 10 (flat config).
