# @offthegully/veneerui

## 0.2.0

### Minor Changes

- e05efef: Add per-status on-fill text tokens: `color-text-on-success`, `color-text-on-warning`,
  `color-text-on-danger`, `color-text-on-info` (utilities `text-text-on-success` etc.).

  Previously `color-text-on-primary` was the _only_ on-fill text token, shared across
  `bg-primary` and every status fill — so a `bg-danger` surface couldn't take a
  different foreground than a pale `bg-primary` without reaching for a literal. Each
  status fill now has its own on-color, defaulted to contrast (WCAG) with that
  status's default fill: dark on the default green/amber/sky, white on the default
  red. The built-in themes set overrides where their fill's lightness flips the
  choice (e.g. pale `glassmorphic`/`neumorphic`/`default-dark` danger → dark text;
  deep `editorial`/`warm-library` success/warning/info → light text). `color-text-on-primary`
  is unchanged.

- e05efef: Add custom themeable colors via the reserved `color-x-*` namespace. Apps can now
  define arbitrary named colors (e.g. `color-x-gold`, `color-x-chart-1`) that stay
  fully themeable — real `--color-x-*` custom properties every theme may recolor —
  without hardcoding a hex or overloading a semantic token. Consume them as a
  `var()` (`[color:var(--color-x-gold)]`, `bg-(--color-x-gold)`), which re-skins on
  theme switch and passes the `no-hardcoded-colors` gate.

  The namespace is open but guarded: `validateTheme` accepts only well-formed
  `color-x-<slug>` names with a valid CSS color value (no `var()`, no `url()`/injection
  patterns), capped at 64 per theme; malformed `color-x-` names now fail loudly rather
  than being silently dropped. `applyTheme` sets and clears `--color-x-*` properties so
  custom colors paint after hydration and don't leak across switches, and
  `ThemeProvider` falls back to the app's base theme for any custom color a theme
  omits, preserving the "any theme skins any UI" guarantee. The published JSON Schema
  (`theme-v1.json`) accepts custom keys via `patternProperties` for editor autocomplete.
  This is additive — existing `schemaVersion: 1` themes are unaffected.

- beec13d: Remove the `shuffleUntilPinned` showcase feature to slim the theming runtime down
  to its core guarantee — apply the persisted-or-default theme before first paint,
  with no flash.

  Removed: the `shuffleUntilPinned` option on `veneer()` (Vite) and `<AntiFlashScript>`
  (Next), the `shuffleIds` prop on `<ThemeProvider>`, `useTheme().pinned` and
  `useTheme().shuffle()`, the `SHUFFLE_ATTR` / `ShuffleTheme` exports, the `pinned`
  field on `ThemeLibrary`, and the second (`shufflePool`) argument of
  `getAntiFlashScript`. The no-flash behavior and theme persistence are unchanged —
  selecting a theme in the switcher works exactly as before. Apps that opted into
  shuffle should drop those props/usages.

- e05efef: Promote the status colors to first-class interactive roles: add `-hover`,
  `-active`, and `-subtle` for `success`, `warning`, `danger`, and `info` (utilities
  `hover:bg-danger-hover`, `bg-success-subtle`, etc.), matching what `primary`/`accent`
  already had.

  Previously only `primary` (and partially `accent`) had state/subtle variants, so
  `bg-danger-subtle`, `hover:bg-success-hover` and friends resolved to nothing —
  status buttons couldn't show a hover/pressed state and there were no tinted status
  backgrounds for badges or alert banners. Schema defaults are palette steps of each
  base hue; every built-in theme that re-hues a status now sets matching states,
  derived to track its own lightness/translucency (e.g. glassmorphic lightens with
  translucent subtle, default-dark darkens with a dark-muted subtle).

- 053e255: Add four new themeable token groups so a theme can vary more of the surface:

  - **`color-text-on-accent`** + **`color-accent-subtle`** — bring `accent` to parity
    with `primary`/status colors. `accent` is a fillable color (it has `-hover`/`-active`)
    but had no on-color, so `bg-accent` had to borrow `text-text-on-primary`; on the
    default cyan accent that white text was ~2.2:1, below WCAG AA. `color-text-on-accent`
    defaults dark (like on-info) and fixes it; built-in themes with a dark accent set a
    light override. `color-accent-subtle` adds the tinted background `accent` was missing.
  - **`focus-ring-width`** / **`focus-ring-offset`** — themeable focus-outline geometry to
    pair with the existing `focus-ring` color (the width/offset were previously hardcoded).
    Consume via `focus-visible:[outline-style:solid] focus-visible:[outline-width:var(--focus-ring-width)] focus-visible:[outline-offset:var(--focus-ring-offset)] focus-visible:outline-focus-ring`.
  - **`color-surface-hover`** / **`color-surface-active`** — neutral interactive hover/press
    backgrounds (rows, menu items, ghost buttons), decoupled from `surface-sunken` (a well)
    so a theme can tune interaction feedback independently of recessed depth. Defaults equal
    the previous values, so existing UIs are visually unchanged.
  - **`icon-stroke-width`** — themeable SVG stroke weight (e.g. Lucide `strokeWidth`);
    consume via `[stroke-width:var(--icon-stroke-width)]`, which overrides the SVG
    presentation attribute so icons re-weight at runtime.

  All additive (schema generation 1) — existing themes are unaffected. Built-in themes
  exercise the new axes (Brutalist: thick flush focus ring + heavy icons; High Contrast:
  thick ring; Editorial: thin icons), and seven themes set `color-text-on-accent` where
  their accent is dark enough that the dark default would fail contrast.

## 0.1.4

### Patch Changes

- 22875ad: Add Expo support and update themes.
