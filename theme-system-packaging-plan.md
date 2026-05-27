# Theme System Packaging & Distribution Plan (Phase 6)

How Veneer gets from "a demo app in this repo" to "something other people drop
into their own apps." This is the companion to
[`theme-system-implementation-plan.md`](./theme-system-implementation-plan.md)
(which takes the system through Phase 5) and assumes the architecture in
[`theme-system-overview.md`](./theme-system-overview.md).

---

## Context & the core decision

Today everything reusable lives in `src/theme/`, but it's wired into a demo (the
Showcase, the App shell). Nobody can install it. The job is packaging, not a
rewrite — the runtime already has no dependency on the demo.

The guiding constraint, from the product owner: **do not ship a scaffolder that
users are forced to run.** Real users already create their projects with Vite or
Next + Tailwind and don't want a competing `create-*` that owns their app
skeleton. Veneer must therefore be a **drop-in add-on installed *after* a normal
Vite/Next + Tailwind v4 setup**, the same way you'd add shadcn/ui or a Tailwind
plugin. A greenfield `create-veneer-app` may exist later as an optional
convenience, but it is never the primary path.

Two decisions follow from this and shape everything below:

1. **Distribution = a package + a shadcn-style CLI, not a scaffolder.** A
   publishable `@veneer/theme` package carries the tokens and runtime; a small
   `veneer` CLI patches an *existing* project and copies UI components into it.
2. **The token schema is fixed and shared, owned by the package and versioned.**
   This is what makes a gallery theme authored once apply in anyone's app. An
   app's brand is expressed as *the default theme it ships*, not as a schema
   change. App-specific values that aren't meant to be re-skinnable stay in the
   app's own Tailwind/CSS, which Veneer never touches.

---

## How it interlocks with Tailwind v4

Tailwind v4 is **CSS-first**: design tokens are declared in CSS via `@theme {}`,
not a JS config. That is exactly the seam Veneer needs. The token set ships as a
CSS file, and the entire interlock is one import in the consumer's global
stylesheet:

```css
@import "tailwindcss";
@import "@veneer/theme/tokens.css";   /* the generated @theme block, all 83 tokens */
```

Tailwind compiles `bg-primary`, `rounded-md`, … from those tokens; Veneer's
runtime overrides the same CSS variables at runtime. No JS plugin, no config
surgery. Because both Vite-React and Next just hand a CSS entry to the Tailwind v4
engine, this line is identical across frameworks.

> **To verify during build:** that Tailwind v4 inlines and processes a `@theme`
> block from a `node_modules` package via bare-specifier `@import`. Expected to
> work (v4 resolves package imports for `@import`/`@plugin`/`@source`), but it's
> the one mechanic to confirm first because everything rests on it. Fallback if
> not: document a relative `@import` or a copied `tokens.css`.

### The one real wrinkle → why the UI is copied, not imported

Tailwind v4 **does not scan `node_modules` by default.** If Veneer's UI components
(switcher, import panel) shipped *inside* the package, the utility classes they
use wouldn't be generated in the consumer's build unless the consumer added
`@source "@veneer/theme"`.

That points directly at a **hybrid distribution, mirroring shadcn/ui**:

| Piece | Ships as | Rationale |
|---|---|---|
| `tokens.css` + runtime (`applyTheme`, `ThemeProvider`, `useTheme`, `validate`, schema, import pipeline, anti-flash helpers, Vite plugin) | **npm package** `@veneer/theme` | Logic, ~zero Tailwind-utility surface → no scanning problem; safe as a dependency |
| UI components (`ThemeSwitcher`, `ImportPanel`, `PreviewBanner`) | **copied into the consumer's project** via `npx veneer add` | Tailwind scans the consumer's own source, so the classes generate; consumer owns and can restyle them |

The copied components import their *logic* (`useTheme`, `tokenValue`,
`parseAndValidate`, `fetchTheme`, `browserCheckValue`) from `@veneer/theme`, so
there's no duplicated behavior — only the markup lives in the app.

(Alternative considered and rejected as the default: ship the components with
pre-compiled CSS. It avoids the copy step but makes them un-restyleable and risks
duplicate/colliding utility CSS. Copy-in is the lower-friction, more idiomatic
choice for a Tailwind v4 ecosystem.)

### The anti-flash script is the only framework-specific bit

It can't be a plain import — it's a synchronous `<head>` script that applies the
saved theme before paint. The package exports the framework-agnostic core plus
thin adapters:

- `getAntiFlashScript(): string` — the inline JS, framework-agnostic.
- **Vite:** `@veneer/theme/vite` — a plugin that injects the script into
  `index.html` (so the consumer never edits HTML).
- **Next (App Router):** `<AntiFlashScript />` — a component rendering the inline
  `<script>`, dropped into `app/layout.tsx`'s `<head>`.

Everything else — provider, hook, tokens, validation, import pipeline — is plain,
framework-agnostic React.

### Next.js specifics to handle

- `ThemeProvider` uses context + `localStorage` + `useLayoutEffect`, so it's a
  client component (`"use client"`). The package marks it accordingly.
- SSR has no `localStorage`: the server renders with schema defaults, the
  `<AntiFlashScript>` in `<head>` applies the saved theme before paint, and the
  client provider reconciles to the same values on hydration (no flash, no
  mismatch warning because the script wrote to the DOM, not to React's tree).
- Document that the provider wraps `children` in `app/layout.tsx` and the
  `@import` goes in the global stylesheet Next already loads.

---

## Repository structure (workspace)

Convert this repo into an npm workspace and split the demo from the library:

```
veneer/
├─ packages/
│  ├─ theme/                 → @veneer/theme  (the published library)
│  │  ├─ src/                   runtime: apply, provider, context, hook,
│  │  │                         storage, validate, value-check, import-theme,
│  │  │                         schema, types, anti-flash helpers
│  │  ├─ vite.ts                → @veneer/theme/vite  (anti-flash plugin)
│  │  ├─ tokens.generated.css   → @veneer/theme/tokens.css  (shipped, generated)
│  │  └─ package.json           exports map; react/react-dom/tailwindcss = peers
│  └─ cli/                    → the `veneer` CLI  (init + add)
│     └─ registry/              copy-in UI components (switcher, import panel, banner)
├─ apps/
│  └─ playground/            → today's Showcase app, now consuming @veneer/theme
│                              (the dev harness + the conformance/e2e target)
├─ gallery/                  → unchanged (becomes its own repo in Phase 4)
├─ scripts/generate-theme.ts → now writes into packages/theme + docs
└─ docs/                     → authoring guide, generated reference, integration guides
```

`scripts/generate-theme.ts` keeps `src/theme/schema.ts` (moved to
`packages/theme/src/schema.ts`) as the single source of truth and regenerates
`packages/theme/tokens.generated.css`, the published JSON Schema, and the docs.

---

## `@veneer/theme` public API

The exports are essentially what's already internal — just promoted to a package
boundary:

```ts
// @veneer/theme
export { ThemeProvider } from './ThemeProvider'
export { useTheme } from './theme-context'
export { applyTheme } from './apply'
export { validateTheme } from './validate'
export { browserCheckValue } from './value-check.browser'
export { parseAndValidate, fetchTheme, isFetchableUrl } from './import-theme'
export { tokenValue } from './token-value'
export { TOKEN_SCHEMA, TOKEN_BY_NAME } from './schema'
export { BUILTIN_THEMES, DEFAULT_THEME_ID } from './builtin'
export { getAntiFlashScript } from './anti-flash'
export { SCHEMA_VERSION } from './types'
export type { Theme, ThemeLibrary, TokenDef, TokenType } from './types'

// @veneer/theme/tokens.css   → the @theme block
// @veneer/theme/vite         → veneerVite(): Plugin   (anti-flash injection)
// @veneer/theme/next         → AntiFlashScript        (or re-export from root)
```

`package.json` highlights:
- `peerDependencies`: `react`, `react-dom`, `tailwindcss` (v4).
- `exports` map with the four entry points above; `"sideEffects": ["*.css"]`.
- Build to ESM + `.d.ts` (tsup or equivalent).
- The Node value-checker (`css-tree`) stays out of the browser entry; it's only
  needed by gallery CI, so it lives behind a `@veneer/theme/node` subpath or in
  the CLI, never in the main bundle.

---

## The `veneer` CLI

A small CLI (published as `veneer`, runnable via `npx veneer …`) that automates
the otherwise-manual integration. Every action it performs is documented so the
manual path is always available.

- **`npx veneer init`** — detect Vite vs Next (by config files / deps) and:
  1. install `@veneer/theme`,
  2. add `@import "@veneer/theme/tokens.css";` to the global stylesheet,
  3. wire the anti-flash (Vite: add the plugin to `vite.config`; Next: insert
     `<AntiFlashScript/>` into `app/layout.tsx`'s `<head>`),
  4. wrap the app root in `<ThemeProvider>` (Next: mark the wrapper `"use
     client"`),
  5. optionally add the `no-hardcoded-colors` ESLint rule + conformance test.
  It prints a diff/summary and is idempotent (safe to re-run).
- **`npx veneer add <component>`** — copy a UI component (e.g. `switcher`,
  `import-panel`, `banner`) from the registry into the consumer's components
  directory, rewriting imports to point at `@veneer/theme`. shadcn-style.
- **`npx veneer list`** — show available copy-in components.

The registry is generated from the playground's component source so the CLI and
the live demo never drift.

---

## Consumer workflows (the end state)

**Existing Vite + React + Tailwind v4 app:**
```sh
npm i @veneer/theme
npx veneer init             # @import + Vite anti-flash plugin + <ThemeProvider>
npx veneer add switcher     # copies ThemeSwitcher into ./src/components
```

**Existing Next (App Router) + Tailwind v4 app:**
```sh
npm i @veneer/theme
npx veneer init             # @import in globals.css, <AntiFlashScript/> in layout, provider wrapper
npx veneer add switcher
```

**Fully manual (no CLI), either framework:** documented in the integration guide
as ~4 steps — install, `@import` the tokens CSS, add the anti-flash
(plugin/component/snippet), wrap with `<ThemeProvider>` — then copy the switcher
markup from the docs.

---

## Build sequence

Ordered so each step is independently verifiable and later steps depend on
earlier ones.

### 6.1 — Extract `@veneer/theme`
**Goal:** the runtime is a real package and the demo consumes it.
**Deliverables:** workspace setup; move `src/theme/*` (minus demo components) into
`packages/theme/src`; `package.json` with exports map + peer deps; build to
ESM + types; point `generate-theme.ts` at the new locations; re-point the
playground app at `@veneer/theme`.
**Validation:** `npm test`, lint, typecheck, and `build` all pass at the workspace
root; the playground runs against the built package and still switches/imports
themes; the package builds to `dist` with working types.

### 6.2 — Tailwind interlock + anti-flash adapters
**Goal:** the CSS import and anti-flash work as package entry points.
**Deliverables:** ship `@veneer/theme/tokens.css`; verify the bare-specifier
`@import` resolves and generates utilities in a clean test app; `getAntiFlashScript`
+ `@veneer/theme/vite` plugin + Next `<AntiFlashScript/>`.
**Validation:** a throwaway Vite app and a throwaway Next app, each created with
their *own* tooling, import the package and render a themed, no-flash UI after the
documented steps.

### 6.3 — The `veneer` CLI (`init` + `add`)
**Goal:** the manual steps are automated and framework-aware.
**Deliverables:** `init` (detect + patch Vite/Next), `add` (copy from registry),
`list`; the component registry generated from playground source; idempotency.
**Validation:** running `init` then `add switcher` on fresh Vite and Next apps
produces a working themed app with the switcher, with no manual edits; re-running
`init` is a no-op.

### 6.4 — Docs + publish
**Goal:** anyone can adopt it.
**Deliverables:** `docs/integration-vite.md`, `docs/integration-next.md`
(CLI + manual), README updates, the hosted JSON Schema URL confirmed; npm publish
flow, semver policy, and a note on how `SCHEMA_VERSION` relates to package
versions.
**Validation:** a developer following only the published docs integrates Veneer
into an existing app in under ten minutes.

### 6.5 (optional) — `create-veneer-app`
A thin greenfield scaffolder that runs the framework's own create tool, then
`veneer init`. Built only if there's demand; explicitly not the primary path.

---

## Decisions made up front

- **Drop-in add-on, not a scaffolder.** (Owner constraint.)
- **Schema fixed & shared, versioned by the package.** Brand = a default theme,
  not a schema change. Themeable surface stays portable for the gallery.
- **Hybrid distribution:** runtime + tokens as a dependency; UI components copied
  in. Driven by Tailwind v4's node_modules scanning behavior, not just taste.
- **Tailwind v4 only.** v3 (JS-config based) is out of scope; `@theme` is a v4
  feature.
- **React only for v1.** The runtime is React (context/provider). A
  framework-agnostic core (vanilla `applyTheme` + a web-component switcher) is a
  possible future, not now.

---

## Risks & mitigations

- **`@theme` from a node_modules `@import` doesn't process** → verify in 6.2 first
  (it's the linchpin); fallback to a copied/relative `tokens.css`.
- **Consumer forgets `@import` or the anti-flash** → the two non-obvious steps;
  the CLI handles both, and `init` can detect and warn if the `@import` is
  missing.
- **Tailwind not scanning copied components** → non-issue by design (they land in
  the consumer's scanned source), but `add` should place them under a conventional
  `components/` path and say so.
- **SSR flash / hydration mismatch in Next** → the anti-flash script writes to the
  DOM (not React state) before hydration; provider reconciles to identical values.
  Covered by an explicit Next smoke test in 6.2.
- **Registry/playground drift** → generate the CLI registry from playground source
  so they share one definition (same pattern as the schema generators).
- **Version/schema confusion** → document that adding tokens is an additive
  (minor) change; themes carry `schemaVersion`; old themes keep working via
  defaults.

---

## Out of scope (this phase)

- A full `create-veneer-app` as the default entry point.
- Non-React framework support (Vue/Svelte/vanilla).
- Tailwind v3 compatibility.
- In-app theme editor, server-backed sync, or anything already deferred in the
  main plan.

---

## What you have at each step boundary

| After | You can… |
|---|---|
| 6.1 | Develop against a real package internally; the demo proves it works |
| 6.2 | Hand someone the package + 4 manual steps and they integrate it |
| 6.3 | `npx veneer init` an existing Vite/Next app to a themed UI in one command |
| 6.4 | Publish; external developers adopt from docs alone |
| 6.5 | Offer an optional one-command greenfield start |

6.1 is the prerequisite for everything. 6.2 makes the package genuinely usable.
6.3 is the seamless layer. 6.4 is the public release. 6.5 is gravy.
