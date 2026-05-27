# Veneer

**A user-extensible theming system for Tailwind CSS v4.** The entire visual
surface of an app — color, typography, spacing, borders, radii, shadows, blur,
and motion — is driven by a fixed set of design **tokens**. A *theme* is a small
JSON file that overrides some of those tokens. Switching is instant (one DOM
write, no re-render); an app ships its own set of themes while users can import
and author more; and themes are treated as **inert data, not code**, so they're
safe to load from untrusted sources.

There is no server and no account. A user's theme library lives entirely in their
browser's `localStorage`.

Veneer ships as an npm package (`@veneer/theme`) plus a small `veneer` CLI, so you
drop it into an **existing Vite or Next + Tailwind v4 app** — see
**[Using Veneer in your app](#using-veneer-in-your-app)**. This repository is the
monorepo: the package, the CLI, and a playground app that exercises them.

```
 Gallery (public JSON files)  ──import──▶  Library  ──enable──▶  Enabled  ──select──▶  Current
   browse / download / paste URL          everything           switcher subset      applied now
                                          you "own"
```

---

## Table of contents

- [How it works](#how-it-works)
- [Using Veneer in your app](#using-veneer-in-your-app)
- [Running this repo](#running-this-repo)
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

2. **The token schema is the contract.** `packages/theme/src/schema.ts` is the
   single source of truth — the canonical list of every value a theme may set (name,
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

## Using Veneer in your app

Veneer is a **drop-in add-on, not a scaffolder** — you keep your own Vite/Next +
Tailwind v4 project and add Veneer on top, the way you'd add shadcn/ui. The
`veneer` CLI does the wiring; everything it does is also documented as manual
steps.

```sh
# in your existing Vite + React + Tailwind v4 app
npm i @veneer/theme
npx veneer init            # @import the tokens, wire the anti-flash, print the provider step
npx veneer add switcher    # copy a ThemeSwitcher into your components
```

The interlock is one line of CSS — `@import "@veneer/theme/tokens.css";` after
`@import "tailwindcss";` — which makes Tailwind v4 generate the token utilities
(`bg-primary`, `rounded-md`, …) that Veneer's runtime then overrides at runtime.
The runtime (`ThemeProvider`, `useTheme`, validation, the import pipeline) is a
normal dependency; UI components are **copied into your project** (shadcn-style)
because Tailwind v4 doesn't scan `node_modules`. The anti-flash script is the only
framework-specific piece: a Vite plugin (`@veneer/theme/vite`) or a Next
component (`@veneer/theme/next`).

**Shipping your own themes.** By default `<ThemeProvider>` ships Veneer's five
built-in themes. To ship *your own* set, author them with `defineTheme` (it fills
in the bookkeeping, so you write only the tokens) and pass them in:

```tsx
import { ThemeProvider, defineTheme } from '@veneer/theme'

const themes = [
  defineTheme({ id: 'brand', name: 'Brand', tokens: { 'color-primary': '#5b21b6', /* … */ } }),
  defineTheme({ id: 'brand-dark', name: 'Brand Dark', tokens: { /* … */ } }),
]

// <ThemeProvider themes={themes} defaultThemeId="brand">…</ThemeProvider>
```

Your themes are **app-owned**: non-deletable and re-seeded from the live
definitions on every load, while themes a visitor imports or authors are
preserved alongside them. A theme can change as little as a few colors or as much
as radius, shadow, type, and motion — anything it omits falls back to the schema
default. To also kill the flash on a visitor's first-ever load, pass that same
default to the anti-flash wiring (`veneer({ defaultTheme })` in Vite,
`<AntiFlashScript defaultTheme />` in Next).

Step-by-step, CLI and manual:
**[Vite guide](./docs/integration-vite.md)** · **[Next.js guide](./docs/integration-next.md)**.

---

## Running this repo

This is an npm **workspace** monorepo (`packages/theme`, `packages/cli`,
`apps/playground`). **Prerequisites:** Node 20+ and npm.

```sh
git clone <repo-url> veneer
cd veneer
npm install
npm run dev          # builds @veneer/theme, then runs the playground at http://localhost:5173
```

The playground starts with five built-in themes and the import/preview flow ready.
To build everything (package, playground, CLI):

```sh
npm run build        # gen artifacts → build package → build playground → build CLI
npm run preview      # serve the playground build locally
```

---

## Usage

### Switching themes

Click the theme switcher in the top-right. It lists your **enabled** themes with
preview swatches; selecting one applies it instantly and persists the choice. On
reload, the anti-flash script (injected by the `@veneer/theme/vite` plugin)
re-applies your saved theme *before* the app loads, so there's no flash of the
default.

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

1. Copy the gallery theme closest to your goal (every token you omit falls back to its default, so you only edit what differs).
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

Nine ready-to-use example themes live in **[`gallery/`](./gallery/README.md)**,
each a fully-realized, distinct design language (also the best starting templates
for authoring):

| Theme | Style |
|---|---|
| **Clean Light** | Conservative neutral baseline — fork this first |
| **Midnight** | Proper dark theme (raised surfaces lighter than base) |
| **Brutalist** | Thick black borders, 0 radii, hard offset shadows, display type |
| **Neumorphic** | Soft extruded UI carved from paired light/dark shadows |
| **Glassmorphic** | Translucent frosted panels, backdrop blur, drop shadows |
| **Editorial** | Serif display, enlarged type scale, magazine rhythm |
| **High Contrast** | Black-on-white accessibility theme |
| **Sunset Paper** | Warm cream paper, sunset gradient, playful motion |
| **Neon Arcade** | Synthwave neon, glowing text, gradient headlines |

Each theme ships with a `notes.md` explaining *why* its values were chosen. To
contribute one, see **[gallery/CONTRIBUTING.md](./gallery/CONTRIBUTING.md)**.

---

## The token schema

The v1 schema is **112 tokens**, sized to allow genuinely different design
languages (brutalist, neumorphic, editorial, neon, …) rather than just recolored
variants. It's defined once in `packages/theme/src/schema.ts`; `npm run gen:theme`
generates everything downstream so nothing drifts:

- `packages/theme/tokens.generated.css` — the Tailwind `@theme` / `:root`
  defaults, shipped as `@veneer/theme/tokens.css`
- `packages/theme/theme-v1.json` — the published JSON Schema for `$schema`
- `docs/schema-reference.md` — the human-readable token reference

| Category | Count | Examples |
|---|---:|---|
| Colors | 12 | `color-primary` (+ hover/active/subtle), `color-accent`, status colors, `color-focus-ring` |
| Surfaces | 6 | `color-surface`, `-raised`, `-sunken`, `-overlay`, `-inverse`, `-overlay-backdrop` |
| Text | 5 | `color-text`, `-muted`, `-subtle`, `-inverse`, `-on-primary` |
| Borders | 6 | `color-border` (+ strong/subtle), `border-width-thin`/`-default`/`-thick` |
| Radii | 9 | `radius-none`/`-xs` … `radius-3xl`, `radius-full` |
| Shadows | 18 | `shadow-2xs`…`-2xl`, `inset-shadow-*`, `shadow-glow`/`-card`, `text-shadow-*` (+ glow), `drop-shadow-*` |
| Typography | 36 | `font-sans`/`-serif`/`-mono`/`-display`, `text-xs`…`-9xl`, `font-weight-thin`…`-black`, leading/tracking |
| Spacing | 1 | `spacing` — one base unit that rescales the whole density |
| Effects | 12 | `blur-xs`…`-2xl`, `gradient-primary`/`-accent`/`-surface`/`-text`, `opacity-disabled`/`-overlay` |
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
│  Theme runtime  (@veneer/theme — packages/theme)          │
│   • schema.ts        single source of truth (112 tokens)  │
│   • applyTheme()     writes CSS vars to <html>            │
│   • ThemeProvider    library/enabled/current + preview    │
│   • storage.ts       localStorage persistence (no server) │
│   • validate.ts      isomorphic 3-layer validation        │
│   • import-theme.ts  file/URL → validate → preview        │
│   • anti-flash       getAntiFlashScript + vite/next adapter│
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

**Anti-flash on load.** A self-contained script (from `getAntiFlashScript()`)
reads the persisted library from `localStorage` and applies the current theme's
tokens before any module loads — the same technique every dark-mode
implementation uses. It's injected by the `@veneer/theme/vite` plugin (Vite) or
rendered via `<AntiFlashScript/>` from `@veneer/theme/next` (Next).

---

## Security model

Because themes can be loaded from untrusted sources, validation
(`packages/theme/src/validate.ts`) is the security boundary. It's pure and isomorphic — the
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
JetBrains Mono, Fraunces, Archivo Black, MS Sans Serif, Orbitron, Quicksand) plus CSS generic keywords. Naming
anything else is rejected, so a theme can never silently fall back to a broken
look. The playground loads the bundled fonts in `apps/playground/src/main.tsx`;
a consumer app imports whichever of those faces it ships.

Because a theme can only set declared CSS variables — which are then consumed by
utilities already in the compiled CSS — there is no path from a theme to new CSS
rules, modified HTML, or executed code. The schema is the entire attack surface,
and it's narrow and validated.

---

## Project structure

```
veneer/                              npm workspace monorepo
├─ packages/
│  ├─ theme/                       → @veneer/theme (the published runtime)
│  │  ├─ src/
│  │  │  ├─ schema.ts              ★ single source of truth — 112-token TOKEN_SCHEMA
│  │  │  ├─ types.ts               Theme, ThemeLibrary, TokenDef, SCHEMA_VERSION
│  │  │  ├─ apply.ts               applyTheme() — writes CSS vars, reconciles defaults
│  │  │  ├─ validate.ts            validateTheme() — the security boundary
│  │  │  ├─ value-check{,-browser,-node}.ts  isomorphic per-type CSS checking
│  │  │  ├─ storage.ts storage-key.ts  localStorage load/save + the shared key
│  │  │  ├─ theme-context.ts       ThemeContext + useTheme()
│  │  │  ├─ ThemeProvider.tsx      library/enabled/current/preview state owner
│  │  │  ├─ import-theme.ts        parse + validate + provenance (file / URL)
│  │  │  ├─ anti-flash.ts vite.ts next.tsx  pre-paint script + framework adapters
│  │  │  ├─ index.ts node.ts       public API barrel + the Node (css-tree) entry
│  │  │  ├─ builtin/               5 built-in themes (light, dark, high-contrast, …)
│  │  │  └─ *.test.ts              validation, storage, import, schema, builtin
│  │  ├─ tokens.generated.css      ⚙ shipped as @veneer/theme/tokens.css
│  │  ├─ theme-v1.json             ⚙ shipped, published JSON Schema
│  │  └─ package.json tsup.config.ts   exports map, peers, ESM+types build
│  └─ cli/                         → the `veneer` CLI (init + add + list)
│     ├─ src/{cli,init,add,list,detect,patch,registry}.ts + *.test.ts
│     └─ registry/                 ⚙ copy-in components, generated from the playground
├─ apps/
│  └─ playground/                  → demo app; the dev harness + conformance/e2e target
│     ├─ src/{main,App}.tsx index.css   consumes @veneer/theme like any app
│     ├─ src/components/         ThemeSwitcher, ImportPanel, PreviewBanner, ThemeShowcase
│     ├─ src/{conformance,gallery}.test.ts   scans rendered UI + validates gallery
│     ├─ eslint-rules/           shared color detector + no-hardcoded-colors rule
│     └─ vite.config.ts index.html tsconfig*.json eslint.config.js
├─ scripts/
│  ├─ generate-theme.ts            ⚙ regenerates CSS / JSON Schema / token reference
│  └─ build-registry.ts            ⚙ regenerates the CLI registry from playground source
├─ gallery/                        8 example themes (+ notes), becomes a GitHub repo in Phase 4
├─ docs/
│  ├─ integration-vite.md  integration-next.md   how to add Veneer to your app
│  ├─ authoring-guide.md          conceptual authoring guide (hand-written)
│  └─ schema-reference.md          ⚙ generated token reference
└─ theme-system-{overview,implementation-plan,packaging-plan}.md   design docs

★ = source of truth   ⚙ = generated (do not edit by hand)
```

---

## Scripts

Run from the repo root; each orchestrates across the workspaces.

| Command | What it does |
|---|---|
| `npm run dev` | Build `@veneer/theme`, then run the playground dev server |
| `npm run build` | gen artifacts → build package → build playground → build CLI |
| `npm run build:theme` / `build:cli` | Build just the package / just the CLI (+ its registry) |
| `npm run gen:theme` | Regenerate CSS / JSON Schema / token reference from `TOKEN_SCHEMA` |
| `npm run gen:registry` | Regenerate the CLI's copy-in registry from the playground components |
| `npm run lint` | ESLint across workspaces (incl. the `veneer/no-hardcoded-colors` rule) |
| `npm run typecheck` | Type-check every workspace |
| `npm test` | Vitest across every workspace (package, playground, CLI) |
| `npm run preview` | Serve the playground production build |

---

## Testing & quality

`npm test` runs **89 tests** across the workspaces: theme validation, schema
expressiveness, the `defineTheme` helper, storage reconciliation (including
developer-supplied theme sets), the anti-flash script, built-in and gallery theme
validity, the import pipeline, conformance, and the CLI (framework detection,
idempotent config patching, registry resolution).

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

## Further reading

- **[theme-system-overview.md](./theme-system-overview.md)** — full architecture
  and mental model.
- **[theme-system-implementation-plan.md](./theme-system-implementation-plan.md)**
  — the phased implementation plan.
- **[docs/authoring-guide.md](./docs/authoring-guide.md)** — how to author a
  coherent theme.
- **[docs/schema-reference.md](./docs/schema-reference.md)** — every token (generated).
- **[docs/integration-vite.md](./docs/integration-vite.md)** /
  **[integration-next.md](./docs/integration-next.md)** — add Veneer to your own app.
- **[docs/publishing.md](./docs/publishing.md)** — releasing the package + CLI, and
  the semver / `SCHEMA_VERSION` policy.
- **[theme-system-packaging-plan.md](./theme-system-packaging-plan.md)** — the
  distribution/packaging design (Phase 6).
