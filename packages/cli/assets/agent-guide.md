## Veneer theming — writing components

This project uses **Veneer**, a theming layer on Tailwind CSS v4. The entire
visual surface (color, type, spacing, borders, radii, shadows, blur, motion)
comes from a fixed set of **design tokens**; a *theme* is JSON that overrides
some of them, applied as CSS custom properties at runtime, so the UI re-skins
instantly with no rebuild. To keep that working, **every component must express
visual values through tokens — never hardcode them.**

### The rule: no hardcoded visual values

A hardcoded color is an "island" no theme can re-skin. Don't use:

- raw Tailwind palette shades — `bg-blue-500`, `text-white`, `bg-black`
- arbitrary color values — `bg-[#fff]`, `text-[rgb(0,0,0)]`, `[color:#333]`
- bare color literals in inline styles — `style={{ color: '#333' }}`

Use a **semantic token utility** (`bg-primary`, `text-text-muted`) or a
`var(--token)` reference instead. For SVGs, use `fill="currentColor"` /
`stroke="currentColor"` so they inherit the themed text color.

### How tokens reach a component (the non-obvious part)

Most tokens are ordinary Tailwind utilities — just use the class: `bg-primary`,
`text-text`, `rounded-md`, `text-5xl`, `font-display`, `font-black`,
`leading-relaxed`, `tracking-tight`, `blur-md` / `backdrop-blur-md`,
`ease-snappy`, `drop-shadow-lg`.

But a few tokens have **no utility**, and there the obvious Tailwind class
silently breaks runtime theming. Use the right-hand form:

| Need | Breaks theming | Use instead |
|---|---|---|
| box-shadow | `shadow-md`, `shadow-card` | `[box-shadow:var(--shadow-md)]` |
| text-shadow | `text-shadow-glow` | `[text-shadow:var(--text-shadow-glow)]` |
| border width | `border`, `border-2` | `[border-width:var(--border-width-default)]` (+ `border-border` for color) |
| transition duration | `duration-200` | `duration-[calc(var(--duration-default)*1ms)]` |
| gradient fill | — | `bg-(image:--gradient-primary)` |
| token opacity | `opacity-50` | `opacity-(--opacity-disabled)` |

Why shadows are special: Tailwind v4 bakes the geometry of the named `shadow-*`
/ `text-shadow-*` utilities at build time (only the color is a runtime var), so
re-theming wouldn't update them — the `[box-shadow:var(--shadow-md)]` form stays
themeable. `drop-shadow-*` is the exception, so its class is fine. Durations are
unitless numbers in ms, hence the `*1ms` in the calc. Gradient text:
`bg-clip-text text-transparent bg-(image:--gradient-text)`.

### Token vocabulary (use role-based names)

- **Brand:** `primary` (+ `-hover`/`-active`/`-subtle`), `accent` (+ states),
  `success`, `warning`, `danger`, `info`, `focus-ring`.
- **Surfaces:** `surface` (page) → `surface-raised` (cards, sits above) →
  `surface-sunken` (wells, recedes); plus `surface-overlay`, `surface-inverse`,
  `overlay-backdrop`.
- **Text color:** `text-text` (body), `text-text-muted`, `text-text-subtle`,
  `text-text-inverse`, `text-text-on-primary` (text on a primary/accent/status
  fill). The token family is `text`, so the color utility repeats it — it's
  `text-text-muted`, **not** `text-muted` (which is an undefined class).
- **Borders:** color `border-border` / `border-border-strong` /
  `border-border-subtle` (same doubling — `border-border`, not `border`); width
  tokens `border-width-thin` / `-default` / `-thick`, applied via the
  `[border-width:var(--border-width-default)]` escape hatch above (there's no
  `border-2`-style utility for them).
- **Radii:** `rounded-none` … `rounded-3xl`, `rounded-full`.
- **Type:** families `font-sans` / `font-serif` / `font-mono` / `font-display`;
  sizes `text-xs` … `text-9xl`; weights `font-thin` … `font-black`; `leading-*`;
  `tracking-*`.
- **Spacing:** one base unit drives the whole `p-*` / `gap-*` / `m-*` scale —
  use normal spacing utilities. Off the scale? Use the decimal multiplier
  (`p-4.5` → `calc(var(--spacing) * 4.5)`, any decimal), never a bare-px
  `p-[18px]` — that ignores `--spacing` and won't rescale with the theme.
- **Effects:** `blur-*`, `gradient-primary` / `-accent` / `-surface` / `-text`,
  `opacity-disabled` / `-overlay`.
- **Motion:** `duration-fast` / `-default` / `-slow`; `ease-default` /
  `-snappy` / `-smooth` / `-bounce`.

Read a token value in JS with `tokenValue(current, 'color-primary')` from
`@offthegully/veneerui` (e.g. for a `style` swatch) — never a literal.

### Component patterns

```tsx
// Button — color, radius, shadow (escape hatch), themed motion
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
```

### Verify under a stress theme

A theme only changes what a component **opts into**, and the failures are
*silent*: a card with no shadow token renders flat under Neumorphic — not an
error, just invisible elevation. So after a change, switch through the themes
that each stress one axis and confirm your view **visibly changes**:

| Theme | Stresses | If nothing changes, you're missing… |
|---|---|---|
| Brutalist | borders, hard shadows, radius=0 | border-width / shadow / radius |
| Neumorphic | shadows only | a `[box-shadow:var(--shadow-card)]` on cards |
| Editorial | serif type, scale, leading | `font-display`/`font-serif`, type scale |
| Glassmorphic / Neon | blur, gradient, glow | the effect axes |

**Done checklist:** no raw palette / hex / `*-opacity-N`; off-scale spacing via
`p-4.5` not `p-[18px]`; cards carry a shadow token; distinct headings use
`font-display`; verified by eye under ≥2 stress themes.

### Setup & authoring

- Components added with `npx veneerui add <name>` (e.g. `switcher`) are copied into
  this project and import their logic from `@offthegully/veneerui` — you own and restyle
  the markup, keeping the token rules above.
- Your app root is wrapped in `<ThemeProvider>` (see `npx veneerui init` output);
  read/switch the active theme with `useTheme()`.
- To ship your own theme, use `defineTheme({ id, name, tokens: { /* ... */ } })`.
  A theme is inert data: it can only set known tokens, can't run code, and may
  only name bundled fonts. Two design traps — on dark themes `surface-raised` is
  *lighter* than `surface`; and `text-on-primary` must contrast with the primary
  fill (a pale primary needs *dark* on-primary text).

Full token reference and docs: https://github.com/offthegully/veneerui
