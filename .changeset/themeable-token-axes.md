---
"@offthegully/veneerui": minor
---

Add four new themeable token groups so a theme can vary more of the surface:

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
