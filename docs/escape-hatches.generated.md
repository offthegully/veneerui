<!-- AUTO-GENERATED from packages/theme/src/schema.ts by scripts/generate-theme.ts — do not edit. -->

# Escape-hatch tokens

Most tokens are plain Tailwind utilities — just use the class (`bg-primary`,
`rounded-md`, `text-5xl`, `drop-shadow-lg`). The token groups below are the
exception: they have **no working utility**, so the obvious class silently breaks
runtime theming. Use the `var()` form instead.

| Token group | ❌ Breaks theming | ✅ Themeable form |
|---|---|---|
| box-shadow | `shadow-md`, `shadow-card` | `[box-shadow:var(--shadow-md)]` |
| text-shadow | `text-shadow-glow` | `[text-shadow:var(--text-shadow-glow)]` |
| border-width | `border`, `border-2` | `[border-width:var(--border-width-default)]` |
| duration | `duration-200` | `duration-[calc(var(--duration-default)*1ms)]` |
| gradient | — | `bg-(image:--gradient-primary)` |
| opacity | `opacity-50` | `opacity-(--opacity-disabled)` |

- **box-shadow** — Tailwind v4 bakes the named `shadow-*` geometry at build time (only the color is a runtime var), so re-theming wouldn't update it.
- **text-shadow** — Same build-time bake as box-shadow.
- **border-width** — No Tailwind width utility maps to the token; pair with `border-border` for the color.
- **duration** — Durations are unitless numbers in ms, hence the `*1ms` in the calc.
- **gradient** — Gradient text: `bg-clip-text text-transparent bg-(image:--gradient-text)`.

`drop-shadow-*` is the exception among shadows: its utility already resolves
`var(--drop-shadow-*)`, so the `drop-shadow-lg` class is fine.

### Tokens in each group

- **box-shadow:** `shadow-2xs`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`, `shadow-card`, `shadow-glow`, `inset-shadow-sm`, `inset-shadow-md`, `inset-shadow-lg`
- **text-shadow:** `text-shadow-sm`, `text-shadow-md`, `text-shadow-lg`, `text-shadow-glow`
- **border-width:** `border-width-thin`, `border-width-default`, `border-width-thick`
- **duration:** `duration-fast`, `duration-default`, `duration-slow`
- **gradient:** `gradient-primary`, `gradient-accent`, `gradient-surface`, `gradient-text`
- **opacity:** `opacity-disabled`, `opacity-overlay`
