# Theme System Overview

A user-extensible theming system for the application. The app ships with a small set of built-in themes; users can import additional themes from a shared **GitHub gallery**, curate which ones appear in their switcher, and author their own themes locally and contribute them back. There is no custom marketplace server: themes are browsed as JSON files in a public repo and imported into the app client-side. The system is built on Tailwind CSS v4 with CSS custom properties as the runtime mechanism, and treats themes as **data, not code** — making them safe to load from untrusted sources.

This document describes the architecture and the mental model. The companion document, `theme-system-implementation-plan.md`, breaks the work into phases.

---

## Core concepts

**A theme is a JSON document** that maps token names to values. It contains no CSS, no scripts, no markup — just a set of values like `"color-primary": "#3b82f6"` and `"radius-md": "8px"`. Themes are inert data. They can't break the app, exfiltrate data, or inject styles outside their declared schema.

**The token schema is the contract.** It is the canonical list of every value a theme is allowed to set: token name, type, category, default value, description. Theme authors target the schema. Component authors reference the same schema through Tailwind utility classes. The two groups never share a vocabulary directly — they share the schema.

**Tailwind is the rendering layer.** Components use Tailwind utilities (`bg-primary`, `rounded-md`, `text-text-muted`) that resolve to CSS custom properties. Themes mutate those custom properties at runtime. The two systems are connected only through CSS variable names and never call each other.

**The library is the user's collection.** Built-in themes plus themes the user has imported from the gallery plus themes the user has created. The library can be large; the user doesn't need to see all of it in their switcher.

**Enabled themes are the curated subset.** A user might have 30 themes in their library but only want 4 visible in the switcher. Enabling/disabling is a one-click operation that doesn't remove the theme from the library — it only controls switcher visibility.

**The current theme is the one applied right now.** Always exactly one. Must be a member of the enabled set.

---

## The four-state model

```
 Gallery (a public GitHub repo of theme JSON, browsable by anyone)
        │
        │   import  →  download the JSON (or paste its raw URL),
        │              validate, and copy it into the user's library
        ▼
   Library  ─── all themes the user "owns"
        │       (built-ins + imported + drafts)
        │
        │   enable  →  add to switcher
        ▼
   Enabled  ─── subset that appears in the theme switcher
        │
        │   select  →  apply
        ▼
   Current  ─── the one theme currently visible to the user
```

The boundaries between these states are what prevent the system from feeling cluttered. A user can hoard themes in their library without polluting their switcher. Disabling a theme is reversible (it stays in the library); removing it from the library is the rarer, more deliberate action.

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│  Theme Manager (this system)                           │
│                                                         │
│  • Token schema definition                             │
│  • Theme JSON validation                               │
│  • Library / enabled / current state + persistence     │
│  • Switcher UI, library manager UI, gallery browse UI  │
│  • applyTheme() runtime function                       │
│  • Theme import (file drop / raw-URL fetch + validate) │
│  • Static GitHub gallery (no app server)               │
├────────────────────────────────────────────────────────┤
│  Tailwind CSS v4                                       │
│                                                         │
│  • @theme directive: tokens → CSS variables + utilities│
│  • Utility class compilation                           │
│  • color-mix() for opacity modifiers                   │
├────────────────────────────────────────────────────────┤
│  Browser                                               │
│                                                         │
│  • CSS custom property cascade                         │
│  • Inline style on <html> overrides :root defaults     │
└────────────────────────────────────────────────────────┘
```

The boundary between the theme manager and Tailwind is the set of CSS variable names declared in the token schema. Tailwind reads from those variables; the theme manager writes to them. Neither layer knows or needs to know what the other is doing internally.

---

## The token schema

The schema is the single most important design decision in the system. It defines what a theme can express, what an author can edit, and what every component is allowed to depend on. Critically, the schema also determines how *different* themes are allowed to be from each other — a thin schema produces palette-swap variants, while a rich schema can support genuinely different design languages.

```ts
type TokenType =
  | 'color'        // any valid CSS color
  | 'length'       // px, rem, em, %, etc.
  | 'shadow'       // box-shadow value (can include inset, multiple layers)
  | 'fontFamily'   // CSS font-family stack
  | 'number'       // unitless number (opacity, line-height, font-weight)
  | 'easing'       // CSS timing function (cubic-bezier, linear, etc.)
  | 'gradient';    // linear-gradient / radial-gradient string

interface TokenDef {
  name: string;             // CSS var name without "--", e.g. "color-primary"
  type: TokenType;
  category: string;         // "Colors", "Radii", "Shadows", "Typography", etc.
  bridge: 'theme' | 'root'; // how it reaches components (see below)
  default: string;          // fallback when a theme doesn't set this token
  description: string;      // shown in the schema reference docs
  required?: boolean;       // themes may omit non-required tokens entirely
  deprecated?: boolean;     // hidden from authoring docs, still applied at runtime
}
```

**Token names map to Tailwind v4 namespaces.** `bridge: 'theme'` tokens are declared in Tailwind's `@theme` block, so each one both emits a `--name` custom property *and* generates a utility class — `--color-primary` → `bg-primary`, `--radius-md` → `rounded-md`, `--font-weight-bold` → `font-bold`, `--blur-md` → `blur-md` and `backdrop-blur-md`, `--ease-snappy` → `ease-snappy`. `bridge: 'root'` tokens are values Tailwind has no namespace for (border widths, transition durations, opacities, gradients); they're plain `:root` variables consumed via `var()` or arbitrary-property utilities like `duration-(--duration-default)`. Either way, `applyTheme()` overrides the same custom property at runtime, so theming behaves identically for both.

### Token categories

The v1 schema lands at **83 tokens**, within the **80–120** target. This is larger than a typical "color palette" theme system but smaller than a full design-system spec (Material has ~200). The size is calibrated to allow genuinely different aesthetics — brutalist, neumorphic, glassmorphic, editorial, minimal — not just recolored variants of the same UI. The authoritative list is `src/theme/schema.ts`; the generated `docs/schema-reference.md` is its human-readable form. The counts below reflect the v1 schema.

**Colors (12)** — color-primary plus -hover / -active / -subtle; color-accent plus -hover / -active; color-success, -warning, -danger, -info; color-focus-ring.

**Surfaces (6)** — color-surface (page background), -surface-raised (cards), -surface-sunken (wells), -surface-overlay (menus/modals), -surface-inverse, -overlay-backdrop (scrim).

**Text (5)** — color-text (body), -text-muted, -text-subtle, -text-inverse, -text-on-primary.

**Borders (6)** — color-border, -border-strong, -border-subtle (namespaced colors); border-width-thin / -default / -thick (`root` vars — Tailwind has no border-width namespace). Border-style is omitted from v1.

**Radii (7)** — radius-none (0px), -sm, -md, -lg, -xl, -2xl, -full (pill).

**Shadows (8)** — shadow-sm, -md, -lg, -xl (elevation scale); inset-shadow-sm, -lg (neumorphic insets — note the `inset-shadow-*` namespace, not `shadow-inset-*`); shadow-glow (retro/playful); shadow-card (semantic alias).

**Typography (25)** — font-sans, -serif, -mono, -display (family stacks, restricted to the bundled set); text-xs through text-6xl (10 size steps); font-weight-light / -normal / -medium / -bold / -black (the `--font-weight-*` namespace); leading-tight / -normal / -relaxed; tracking-tight / -normal / -wide.

**Spacing (1)** — a single `spacing` base unit. Tailwind v4 derives the entire scale from it (`p-4` = `calc(var(--spacing) * 4)`), so overriding this one token rescales density globally (cramped brutalist vs. airy neumorphic vs. dense editorial).

**Effects (6)** — blur-sm, -md, -lg (the `--blur-*` namespace feeds *both* `blur-*` and `backdrop-blur-*`, e.g. glassmorphism); gradient-primary (`root`); opacity-disabled, opacity-overlay (`root`).

**Motion (7)** — duration-fast (80), -default (200), -slow (400) — milliseconds, `root` vars consumed via `duration-(--duration-default)`; ease-default, -snappy, -smooth, -bounce (the `--ease-*` namespace).

### Example tokens

A small representative sample, illustrating the type system:

```ts
const TOKEN_SCHEMA: TokenDef[] = [
  // Colors — bridge 'theme' → bg-primary, text-*, border-*, ring-* utilities
  { name: 'color-primary',     type: 'color',      category: 'Colors',     bridge: 'theme', default: '#3b82f6', description: 'Main brand color', required: true },
  { name: 'color-surface',     type: 'color',      category: 'Surfaces',   bridge: 'theme', default: '#ffffff', description: 'Default page background', required: true },
  { name: 'color-text',        type: 'color',      category: 'Text',       bridge: 'theme', default: '#111827', description: 'Body text color', required: true },
  // Borders — color is namespaced; width has no namespace, so bridge 'root'
  { name: 'color-border',      type: 'color',      category: 'Borders',    bridge: 'theme', default: '#e5e7eb', description: 'Default border color' },
  { name: 'border-width-thick',type: 'length',     category: 'Borders',    bridge: 'root',  default: '3px',     description: 'Heavy border for brutalist/emphasis themes' },
  // Radii → rounded-md, rounded-full
  { name: 'radius-md',         type: 'length',     category: 'Radii',      bridge: 'theme', default: '8px',     description: 'Default radius for cards, buttons' },
  // Shadows → shadow-md, inset-shadow-sm
  { name: 'shadow-md',         type: 'shadow',     category: 'Shadows',    bridge: 'theme', default: '0 4px 6px -1px rgb(0 0 0 / 0.1)', description: 'Default elevation' },
  { name: 'inset-shadow-sm',   type: 'shadow',     category: 'Shadows',    bridge: 'theme', default: 'inset 0 2px 4px rgb(0 0 0 / 0.06)', description: 'Inset shadow for neumorphic depressions' },
  // Typography → font-display, text-base, font-bold, tracking-tight
  { name: 'font-display',      type: 'fontFamily', category: 'Typography', bridge: 'theme', default: "'Inter Variable', system-ui, sans-serif", description: 'Display/heading font (restricted to the bundled set)' },
  { name: 'text-base',         type: 'length',     category: 'Typography', bridge: 'theme', default: '16px',    description: 'Default body text size' },
  { name: 'font-weight-bold',  type: 'number',     category: 'Typography', bridge: 'theme', default: '700',     description: 'Bold weight value' },
  { name: 'tracking-tight',    type: 'length',     category: 'Typography', bridge: 'theme', default: '-0.02em', description: 'Tight letter-spacing' },
  // Spacing — one multiplier drives the whole scale (p-4 = calc(spacing * 4))
  { name: 'spacing',           type: 'length',     category: 'Spacing',    bridge: 'theme', default: '0.25rem', description: 'Base spacing unit; the theme density lever' },
  // Effects — blur-md feeds blur-* AND backdrop-blur-*; gradient has no namespace
  { name: 'blur-md',           type: 'length',     category: 'Effects',    bridge: 'theme', default: '12px',    description: 'Blur radius for blur-* and backdrop-blur-* (glassmorphism)' },
  { name: 'gradient-primary',  type: 'gradient',   category: 'Effects',    bridge: 'root',  default: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', description: 'Optional gradient for primary surfaces' },
  // Motion — durations are root vars; easings are namespaced → ease-default
  { name: 'duration-default',  type: 'number',     category: 'Motion',     bridge: 'root',  default: '200',     description: 'Default transition duration in ms' },
  { name: 'ease-default',      type: 'easing',     category: 'Motion',     bridge: 'theme', default: 'cubic-bezier(0.4, 0, 0.2, 1)', description: 'Default easing curve' },
];
```

The full 83-token list lives in `src/theme/schema.ts`; this is a representative slice showing both bridges and the v4-aligned names.

### What this schema size enables

With the full 83-token vocabulary, themes can express fundamentally different design languages, not just color variants. A brutalist theme sets `border-width-thick: 4px`, `radius-md: 0px`, `shadow-md: 4px 4px 0 0 #000`, picks a tight tracking value and a display font like Archivo Black, and sets `duration-default: 80` for snappy motion. A neumorphic theme sets large radii, dual inset+outset shadows, low-contrast surface colors close to the page background, and a smooth easing curve. A glassmorphic theme uses semi-transparent surfaces (`color-surface: rgb(255 255 255 / 0.6)`), a meaningful `blur-md`, subtle borders, and gradient accents. An editorial theme reaches for a serif `font-display`, a larger `spacing` unit for airy density, and the upper end of the type scale.

The schema doubles as a UI specification for the eventual editor, a documentation source for authors, and a JSON Schema generator for editor autocomplete in VS Code. One source of truth.

### Honest limits of token-based theming

Even with a rich schema, some kinds of variation aren't achievable through tokens alone. Themes can change visual values; they can't change component structure. Effects that require multiple coordinated layers (a textured noise overlay, an offset 3D-press button, an animated gradient border) generally need pseudo-elements or extra DOM, which themes can't introduce. Motion choreography (staggered list animations, page transitions) requires component-level code. The boundary is: themes express a **visual language**, not a **structural one**. If two aesthetics need different component anatomy, that's a different design system, not a different theme.

---

## Tailwind v4 integration

Tailwind v4's `@theme` directive declares design tokens that simultaneously become CSS variables AND utility classes. One declaration handles both halves of the bridge:

```css
/* app.css */
@import "tailwindcss";

@theme {
  --color-primary:        #3b82f6;
  --color-primary-hover:  #2563eb;
  --color-surface:        #ffffff;
  --color-surface-raised: #f9fafb;
  --color-text:           #111827;
  --color-text-muted:     #6b7280;
  --color-border:         #e5e7eb;
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   16px;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.1);
  --font-sans:   'Inter', system-ui, sans-serif;
}
```

This single block produces:

- CSS custom properties on `:root` (default values that themes override)
- Tailwind utility classes: `bg-primary`, `text-text-muted`, `rounded-md`, `shadow-card`, `font-sans`, etc.
- Opacity modifier support via `color-mix()` — `bg-primary/50` works with any color format

Components use Tailwind utilities exclusively. They never reference CSS variables directly and never inline hex codes:

```tsx
function Button({ children }) {
  return (
    <button className="bg-primary hover:bg-primary-hover text-white rounded-md shadow-card font-sans">
      {children}
    </button>
  );
}
```

When a theme is applied, the inline style on `<html>` overrides the `:root` defaults via the cascade, and every Tailwind utility automatically reflects the new value. No re-render, no component changes — pure CSS.

### Making components themeable

The decoupling above only holds if every component sources its visual values from the schema. A single hardcoded value — `bg-blue-500`, `text-[#fff]`, an inline `style={{ color: '#333' }}`, a raw `box-shadow` in a CSS module — creates an island that no theme can reach. When the user switches to a dramatically different theme, those islands stay put and the UI looks half-themed.

So the contract is: **components use semantic token utilities exclusively** (`bg-primary`, `text-text-muted`, `rounded-md`, `shadow-card`) and never hardcode a color, radius, shadow, font, or spacing value. This is the largest piece of implementation work for an existing app and it is ongoing discipline, not a one-time pass. Two mechanisms keep it honest:

- A **lint rule** that bans hardcoded color/arbitrary-value utilities (`bg-[#…]`, `text-blue-500`, inline color styles) outside the `@theme` declaration itself.
- A **conformance check** that applies a drastic theme (e.g. `high-contrast`) in a test environment and asserts there are no un-themed islands — that switching themes actually re-skins 100% of the rendered UI.

---

## Runtime: applying themes

Themes are applied by setting CSS custom properties on `document.documentElement` via inline style. Inline styles outrank `:root` declarations in the cascade, so default values declared in `@theme` act as fallbacks for any token the active theme doesn't override.

```ts
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const def of TOKEN_SCHEMA) {
    const value = theme.tokens[def.name];
    if (value && isValidValue(value, def.type)) {
      root.style.setProperty(`--${def.name}`, value);
    } else {
      // Removing the inline override falls back to the :root default
      root.style.removeProperty(`--${def.name}`);
    }
  }
}
```

This approach has several useful properties: it works for any theme without prior knowledge (no CSS file needs to ship with each theme), it's instantaneous (one DOM write), and it composes cleanly with the cascade so partial themes work correctly.

To prevent a flash-of-default-theme on initial load, a small synchronous script injected into `<head>` reads the user's current theme ID from `localStorage` and applies it before the React app hydrates. This is the same technique used by every dark-mode implementation.

---

## Library and state

The user's theme state is held entirely client-side and persists in `localStorage` (or `IndexedDB` if themes grow large enough to matter, which is unlikely — themes are typically under 1 KB each). **There is no server and no user account.** The library lives in the browser that created it; cross-device sync is a deliberate non-goal for now (it's the main thing a future server-backed version would add). Clearing browser storage clears the library — built-ins are restored on load, but imported and custom themes would need to be re-imported.

```ts
interface Theme {
  id: string;                         // uuid
  name: string;
  author: { id: string; name: string };
  version: string;                    // semver
  schemaVersion: number;              // which generation of TOKEN_SCHEMA
  tokens: Record<string, string>;     // partial; missing tokens use defaults
  source: 'builtin' | 'imported' | 'custom';
  sourceUrl?: string;                 // raw URL it was imported from (for optional update checks)
  importedAt?: string;
}

interface ThemeLibrary {
  themes: Theme[];                    // everything in the library
  enabledIds: Set<string>;            // subset shown in switcher
  currentId: string;                  // currently applied theme
}
```

Built-in themes are merged into the library on app load and are not removable. Imported themes are snapshotted from the gallery (a copy of the JSON is stored locally, not a reference). Drafts created by the user live alongside both.

**The snapshot model** is deliberate: when a user imports a theme, they get a frozen copy of that version. If the author publishes an update in the gallery, the user is not auto-updated; an optional update check (re-fetching `sourceUrl` and comparing `version`) can surface that a newer version exists. This protects users from breakage and from bait-and-switch changes, and it makes the system work offline.

---

## Authoring model

For v1, the system has no in-app editor. Theme authors work locally in their preferred editor (VS Code, Cursor, etc.), iterate against a live preview in the app, and import the finished JSON file into their library (and optionally contribute it to the gallery).

This works well because the token schema is published as a **JSON Schema document** at a stable URL. Theme files reference it via the `$schema` field, and any modern editor will then provide:

- Autocomplete for token names
- Inline documentation on hover
- Real-time validation with errors on invalid values
- Enum suggestions where appropriate

```json
{
  "$schema": "https://yourapp.com/schemas/theme-v1.json",
  "name": "Midnight Oak",
  "description": "Warm dark theme with amber accents",
  "author": "jane",
  "version": "1.0.0",
  "schemaVersion": 1,
  "tags": ["dark", "warm"],
  "license": "MIT",
  "tokens": {
    "color-primary":       "#d4a574",
    "color-primary-hover": "#b8895a",
    "color-surface":       "#1a1612",
    "color-surface-raised":"#2a221c",
    "color-text":          "#f5e6d3",
    "color-text-muted":    "#a89684",
    "color-border":        "#3d3027"
  }
}
```

To preview locally, the author drags their `theme.json` into the app's "Preview a theme" surface. The app validates the file, applies it to the current session via `applyTheme()`, and shows a banner indicating preview mode is active. The author edits, drops again, repeats. Once satisfied, they save it to their library and — to share it — open a PR adding the JSON to the gallery repo.

The system ships with:

- A **schema reference** document, auto-generated from `TOKEN_SCHEMA` so it can never drift
- An **authoring guide** with conceptual advice on coherent palettes, contrast, and common pitfalls
- An **examples directory** of 4–6 themes covering different aesthetic strategies (clean light, proper dark, high-contrast, warm paper, brutalist, etc.), each with a brief notes file explaining the choices

---

## Gallery (GitHub)

There is no custom marketplace server. Shared themes live as plain `.json` files in a public **GitHub repository** — the same repo that holds the example themes. This is enough to get themes in front of users and contributors without standing up a backend, accounts, or a database.

**Browse** — users navigate the gallery on GitHub directly, or via an optional **GitHub Pages** site generated from the repo. Because previews render programmatically from token values (no image hosting needed), the Pages site can show a small live preview card per theme. Organization (tags, categories) is just folder structure and front-matter in the repo.

**Publish** — an author opens a **pull request** adding their `theme.json` to the repo. CI runs the same `validateTheme()` used everywhere else and rejects malformed or unsafe themes before merge. A human merges the PR. This replaces an upload form and doubles as lightweight curation.

**Import** — to use a gallery theme, the user either downloads the `.json` and drops it into the app's import surface, or copies the file's **raw URL** and pastes it; the app fetches, validates, and saves a snapshot to the library. Import is a pure copy operation: the user's local copy is the authoritative version they see, and the app never holds a live reference to the remote file.

A server-backed marketplace — with accounts, install counts, in-app publishing, ratings, and server-driven update notifications — is explicitly deferred (see "What's out of scope for v1"). The gallery is designed so that adding such a server later is additive, not a rewrite: the theme JSON format and the import/snapshot model don't change.

---

## Security and validation

Because themes load from untrusted sources, validation is not optional. Validation runs at three points:

1. **On contribution (CI)** — when a theme is proposed to the gallery via PR, CI runs `validateTheme()` against the schema and blocks the merge if it's malformed or unsafe
2. **On import (client)** — when downloading or fetching a theme into the local library, validate again
3. **On apply (client)** — when calling `applyTheme()`, validate each value before writing it to the DOM

The validation rules:

- The JSON must conform to the published JSON Schema (structure, required fields, types)
- Every token name in `tokens` must exist in `TOKEN_SCHEMA`; unknown keys are dropped
- Every value must match its declared type via `CSS.supports()` in the browser (or a CSS parser like `css-tree` in CI/Node, where `CSS.supports` isn't available)
- Values must not contain dangerous patterns: `url()`, `expression()`, `javascript:`, `@import`, `;`, `{`, `}`, `<`, `>`, even if they would parse as valid CSS
- The `schemaVersion` must be supported (currently 1)

A theme that fails any validation step is rejected outright, not silently degraded — a partially-broken theme is worse than no theme.

### Fonts: themes name them, the app loads them

The `url()` blacklist has an important consequence for typography: **a theme cannot load a web font**, because loading one requires `url()` (a `@font-face` src or a stylesheet link), which is exactly what the security model forbids. A `fontFamily` token can therefore only *name* a font — and that name only renders as intended if the font is already available on the page.

So the app **bundles a curated font set** — a sans, a serif, a mono, and one or two display faces (e.g. a dramatic display family for brutalist/editorial looks) — loaded by the app itself, not by any theme. `fontFamily` token values are documented and validated against this bundled set plus generic system stacks (`system-ui`, `serif`, `monospace`, etc.). A theme that names a font outside this set is flagged in validation rather than silently falling back to a system default and looking broken. This is what makes the editorial and brutalist example themes actually render the way their previews promise. Expanding the bundled font set is a deliberate app-level decision, versioned alongside the schema.

The reason this works as a security boundary: themes can only ever set the value of declared CSS custom properties via the `applyTheme()` function. Those properties are then consumed by Tailwind utility classes already in the app's compiled CSS. There is no path for a theme to introduce new CSS rules, modify HTML, or execute code. The schema is the only attack surface, and it's narrow and validated.

---

## Schema evolution

The token schema will change over time. The system is designed to make this painless:

**Adding tokens** — old themes don't have the new token, so they fall back to the default value declared in `@theme`. No migration needed.

**Deprecating tokens** — mark with `deprecated: true` in the schema. Hide from new authoring docs and the eventual editor, but continue to apply at runtime. Themes using the token continue to work.

**Removing tokens** — should be vanishingly rare. If unavoidable, ship a one-shot migration that strips the removed token from stored themes. Increment the schema major version.

**Renaming tokens** — don't. Add the new name, deprecate the old name, eventually drop the old name in a future major version.

Each theme records `schemaVersion`. The runtime supports themes authored against any compatible past version. Future incompatible changes (which should be rare) trigger a major version bump and a migration path.

---

## What's out of scope for v1

These are deliberately deferred. They're reasonable v2/v3 features once there's evidence of need:

- **In-app theme editor** — the visual editor with color pickers, sliders, and live preview. Authors work in JSON locally for v1
- **Per-component overrides** — themes can only set global tokens, not override values for specific components (e.g., "sharper corners on cards specifically")
- **Theme inheritance / forking** — no "based on Midnight Oak with two changes"; authors download the JSON and edit it as their own
- **Palette generation** — no "give me one color, get a coherent palette" tools
- **Contrast checking with warnings** — gallery CI validation can include accessibility as info-level reporting, but does not block
- **Light/dark axis on user themes** — built-in themes can support OS-preference following; user-authored themes are single-mode for v1
- **Server-backed marketplace** — user accounts, in-app publishing, install counts, ratings, and server-driven update notifications. For v1, themes are distributed as a static GitHub gallery and curated via PR review. A server can be layered on later without changing the theme format or the import/snapshot model
- **Cross-device library sync** — the library is local to one browser; syncing it across devices requires the deferred server

---

## Why this architecture holds up

The pattern — design tokens declared in CSS variables, semantic Tailwind utilities, themes as inert data, validation at the boundary — is the same one used by Radix Themes, GitHub's Primer, shadcn/ui, and most production design systems. The gallery and library layer on top of it is the part you're building uniquely, but the underlying mechanism is well-proven.

The two most important properties:

- **Components and themes are decoupled.** A component refactor never breaks themes. A theme addition never requires a component change. The schema is the only contract.
- **Themes are safe by construction.** Because they can only set declared CSS variables, the threat surface is bounded and validatable. The gallery can accept contributions from anyone — CI validation, not manual inspection of every value, is what keeps a merged theme safe.

Everything else in the system — the switcher, the library manager, the gallery browse/import flow — is conventional product engineering on top of those two properties.
