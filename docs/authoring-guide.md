# Authoring a Veneer theme

This is the conceptual guide — how to think about a theme so it ends up coherent.
For the exhaustive list of tokens and their types, see
[`schema-reference.md`](./schema-reference.md). For ready-to-fork examples, see the
[gallery](../gallery/README.md).

A theme is a JSON file: some metadata and a `tokens` object mapping token names to
CSS values. Any token you omit falls back to a sensible default, so you only set
what you want to change. The app applies your tokens as CSS custom properties, so
switching is instant and nothing about your file can execute — it's pure data.

```json
{
  "$schema": "https://veneerui.dev/schemas/theme-v1.json",
  "name": "My Theme",
  "version": "1.0.0",
  "schemaVersion": 1,
  "tokens": {
    "color-primary": "#2563eb",
    "color-surface": "#ffffff",
    "color-text": "#111827"
  }
}
```

Keep the `$schema` line: your editor uses it for token-name autocomplete and to
flag invalid values before you ever open the app.

## 1. Start from an example, not a blank file

Copy the gallery theme closest to your goal and edit it — anything you leave out
falls back to its schema default, so you only set what differs. If you're building
a dark theme, start from one of the dark examples so the surface conventions
(below) are already right. Starting from zero means rediscovering every
relationship the examples already encode.

## 2. Pick the palette as a system, not 20 swatches

The colors are not independent. Decide a few anchors and derive the rest.

- **Surfaces are a ladder.** `surface` is the page; `surface-raised` sits above it
  (cards, menus); `surface-sunken` recedes (wells, insets). On a **light** theme,
  raised is *lighter* and sunken is *darker* than the page. On a **dark** theme,
  this flips: `surface-raised` must be **lighter** than `surface`, because light
  comes from above and a lifted thing catches more of it. Inverting a light theme
  by hand gets this backwards and everything looks subtly wrong.
- **Primary and its states move in one direction.** `color-primary-hover` and
  `-active` are the same hue at different lightness. On light backgrounds they go
  *darker* (more emphasis = more ink); on dark backgrounds they go *lighter* (more
  emphasis = more light). Pick three steps of one color, not three different
  colors.
- **On-colors depend on their fill, not the theme.** Whatever sits on a colored
  fill needs to contrast with *that fill*. A light theme with a pale primary still
  needs dark `text-on-primary` — the most common mistake is white text on a
  light-blue button. Each status fill has its own on-color too: `text-on-success`,
  `text-on-warning`, `text-on-danger`, `text-on-info`. The schema defaults are
  tuned to the *default* fills (dark on green/amber/sky, white on red), so you only
  override the ones whose fill you've shifted in lightness.
- **Status colors (success/warning/danger/info)** should share the palette's
  temperature and saturation so they read as part of the set, not stock traffic
  lights. When you do diverge — a pastel danger, a neon warning — set its
  on-color to match.

## 3. Remember a theme is more than color

The strongest themes change *structure*. Reach for these before adding more
colors — and if you truly need a new color, use the custom-color namespace (§4),
not a hardcoded hex:

- **`border-width-*`** — a 2–3px default border is a whole aesthetic (see
  Brutalist, High Contrast).
- **`radius-*`** — `0px` everywhere reads sharp/technical; large radii read soft.
  Be consistent; mixing 0px and 16px looks accidental.
- **`shadow-*`** — these are full `box-shadow` values, so you control blur, spread,
  color, and even multiple layers. A hard `4px 4px 0 0 #000` (no blur) looks
  printed; paired light+dark insets make neumorphism; deep soft shadows suit dark
  themes. Tint shadows with your text color rather than pure black to keep them in
  the palette.
- **Type** — `font-display` vs `font-sans`, the size scale (`text-base` up), and
  `leading-*`/`tracking-*` carry register. Editorial is almost entirely a
  typography theme.
- **Motion** — `duration-*` (in ms, unitless numbers) and `ease-*` set the
  personality of interactions. Snappy linear vs. slow eased vs. a playful
  overshoot are very different feels.
- **Glow & emitted light** — `text-shadow-*` (incl. a `text-shadow-glow` for a
  multi-layer neon halo) and `drop-shadow-*` (alpha-aware, follows the rendered
  shape) are separate from `shadow-*`. A two-layer `text-shadow-glow` reads as a
  lit sign rather than a blur; lead a `shadow-*` with a `0 0 0 1px <neon>` ring to
  outline cards in light. See **Neon Arcade**.
- **Gradients** — beyond `gradient-primary` you can set `gradient-accent`,
  `gradient-surface` (a subtle page/hero fade), and `gradient-text` (built for
  `bg-clip-text` headlines). These have no Tailwind utility; components read them
  via `bg-[image:var(--gradient-*)]`.
- **Display scale** — the size scale runs to `text-9xl` and weights from
  `font-weight-thin` to `-black`; `tracking-tighter`/`-widest` cover poster-tight
  headlines and spaced-out eyebrow labels.

## 4. Custom colors (beyond the schema palette)

The token list is a closed vocabulary on purpose: any theme can skin any component
because every theme speaks the same words. When you genuinely need a color outside
it — medal gold/silver/bronze, a brand secondary, a chart series — don't hardcode a
hex and don't overload a semantic token (today's "gold = accent" collides the moment
you need a second extra color). Use the reserved **`color-x-*`** namespace: open,
app-defined, and fully themeable.

```json
"tokens": {
  "color-x-gold":   "#d4af37",
  "color-x-silver": "#c0c0c0",
  "color-x-bronze": "#cd7f32"
}
```

- **Name:** `color-x-` + a lowercase slug (letters, digits, hyphens), e.g.
  `color-x-chart-1`. Up to 64 per theme.
- **Value:** any valid CSS color. No `var()` (kept a literal so it validates
  identically in the browser and in CI) and no `url()` — the usual theme value
  rules apply.
- **Declare them in your app's base theme.** Schema tokens fall back to a built-in
  default; custom colors have none, so the base theme is their fallback source.
  Other themes *may* recolor a custom color, but one that omits it falls back to the
  base value — the UI never breaks.

Components consume them as a `var()`, which is themeable and passes the
`no-hardcoded-colors` gate: `[color:var(--color-x-bronze)]`, `bg-(--color-x-gold)`.
Add an inline fallback for a component that might render under a theme without the
color: `[color:var(--color-x-bronze,currentColor)]`.

## 5. Fonts: name, don't load

You can only reference fonts the app bundles, plus CSS generic keywords (`serif`,
`sans-serif`, `monospace`, `system-ui`, …). The current families and how to load
each are in the generated [`docs/fonts.md`](./fonts.md). This is a hard security
rule: themes can't load external resources (no `url()`), so naming a font the app
doesn't have is rejected rather than silently falling back to a broken look. Always
end a font stack with a generic keyword: `"'Fraunces Variable', serif"`.

## 6. Contrast minimums

Aim for **WCAG AA**: 4.5:1 for body text against its surface, 3:1 for large text
and for UI borders/icons that carry meaning. Two traps:

- Don't express "muted" text purely by lightening it toward the background — past
  a point it fails contrast. The High Contrast theme keeps secondary text fully
  black and distinguishes it by size/weight instead.
- Check text **on every surface** it can land on, including `surface-raised`,
  `surface-overlay`, and primary fills — not just the page background.

The soft, low-contrast styles (neumorphic especially) are beautiful and often fail
AA. That's a real tension; if you ship one for production rather than flair, nudge
`color-text` darker until it passes. Note the tradeoff in your `notes.md`.

## 7. Common pitfalls

- **Half-committing.** Mixing sharp and round corners, or one heavy border among
  thin ones, reads as a bug. Pick a position and apply it consistently.
- **Forgetting the dark `text-on-primary` flip** (see §2).
- **Dark themes built by inversion** that leave `surface-raised` darker than the
  page (see §2).
- **Unitless vs. unit values.** `duration-*`, `font-weight-*`, `leading-*`, and
  opacities are **unitless numbers** (`"200"`, `"1.6"`). Lengths need units
  (`"8px"`, `"0.3rem"`). The validator will tell you, but it's the usual first
  error.
- **Setting tokens you don't mean to.** Every token you include overrides the
  default; if you're not changing it, leave it out.

## 8. Preview loop

Open the app → theme switcher → **Manage themes** → drop your file (or paste a raw
URL). It validates locally and applies live as a preview; tweak the file and drop
it again. When it's right, **Save to library**. From a clean checkout of an
example, a first themed result should take well under ten minutes.
