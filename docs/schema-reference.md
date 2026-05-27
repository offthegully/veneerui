<!-- AUTO-GENERATED from packages/theme/src/schema.ts by scripts/generate-theme.ts — do not edit. -->

# Theme Token Reference

Schema generation **1** · **83** tokens. Set any of these in a theme's `tokens` object; omitted tokens fall back to the default.

## Colors

| Token | Type | Default | Required | Description |
|---|---|---|---|---|
| `color-primary` | color | `#3b82f6` | yes | Main brand color |
| `color-primary-hover` | color | `#2563eb` |  | Hover state of primary |
| `color-primary-active` | color | `#1d4ed8` |  | Pressed state of primary |
| `color-primary-subtle` | color | `#dbeafe` |  | Tinted background derived from primary |
| `color-accent` | color | `#06b6d4` |  | Secondary emphasis color |
| `color-accent-hover` | color | `#0891b2` |  | Hover state of accent |
| `color-accent-active` | color | `#0e7490` |  | Pressed state of accent |
| `color-success` | color | `#16a34a` |  | Positive / success status |
| `color-warning` | color | `#d97706` |  | Caution / warning status |
| `color-danger` | color | `#dc2626` |  | Destructive / error status |
| `color-info` | color | `#0ea5e9` |  | Informational status |
| `color-focus-ring` | color | `#3b82f6` |  | Focus outline / ring color |

## Surfaces

| Token | Type | Default | Required | Description |
|---|---|---|---|---|
| `color-surface` | color | `#ffffff` | yes | Default page background |
| `color-surface-raised` | color | `#f9fafb` |  | Raised elements like cards |
| `color-surface-sunken` | color | `#f3f4f6` |  | Recessed wells / insets |
| `color-surface-overlay` | color | `#ffffff` |  | Floating surfaces like menus & modals |
| `color-surface-inverse` | color | `#111827` |  | Inverted surface (e.g. tooltips) |
| `color-overlay-backdrop` | color | `rgb(0 0 0 / 0.5)` |  | Scrim behind modals |

## Text

| Token | Type | Default | Required | Description |
|---|---|---|---|---|
| `color-text` | color | `#111827` | yes | Body text color |
| `color-text-muted` | color | `#6b7280` |  | Secondary text |
| `color-text-subtle` | color | `#9ca3af` |  | Tertiary / placeholder text |
| `color-text-inverse` | color | `#f9fafb` |  | Text on inverse surfaces |
| `color-text-on-primary` | color | `#ffffff` |  | Text rendered on primary fills |

## Borders

| Token | Type | Default | Required | Description |
|---|---|---|---|---|
| `color-border` | color | `#e5e7eb` |  | Default border color |
| `color-border-strong` | color | `#d1d5db` |  | High-emphasis border |
| `color-border-subtle` | color | `#f3f4f6` |  | Low-emphasis border |
| `border-width-thin` | length | `1px` |  | Hairline border width |
| `border-width-default` | length | `1px` |  | Default border width |
| `border-width-thick` | length | `3px` |  | Heavy border for brutalist/emphasis themes |

## Radii

| Token | Type | Default | Required | Description |
|---|---|---|---|---|
| `radius-none` | length | `0px` |  | No rounding (brutalist/sharp) |
| `radius-sm` | length | `4px` |  | Small radius |
| `radius-md` | length | `8px` |  | Default radius for cards, buttons |
| `radius-lg` | length | `12px` |  | Large radius |
| `radius-xl` | length | `16px` |  | Extra-large radius |
| `radius-2xl` | length | `24px` |  | Very large radius (neumorphic) |
| `radius-full` | length | `9999px` |  | Pill / fully rounded |

## Shadows

| Token | Type | Default | Required | Description |
|---|---|---|---|---|
| `shadow-sm` | shadow | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |  | Subtle elevation |
| `shadow-md` | shadow | `0 4px 6px -1px rgb(0 0 0 / 0.1)` |  | Default elevation |
| `shadow-lg` | shadow | `0 10px 15px -3px rgb(0 0 0 / 0.1)` |  | High elevation |
| `shadow-xl` | shadow | `0 20px 25px -5px rgb(0 0 0 / 0.1)` |  | Highest elevation |
| `shadow-card` | shadow | `0 1px 3px 0 rgb(0 0 0 / 0.1)` |  | Semantic alias for card elevation |
| `shadow-glow` | shadow | `0 0 20px rgb(59 130 246 / 0.45)` |  | Glow for retro/playful themes |
| `inset-shadow-sm` | shadow | `inset 0 2px 4px rgb(0 0 0 / 0.06)` |  | Small inset (neumorphic) |
| `inset-shadow-lg` | shadow | `inset 0 4px 8px rgb(0 0 0 / 0.12)` |  | Large inset (neumorphic) |

## Typography

| Token | Type | Default | Required | Description |
|---|---|---|---|---|
| `font-sans` | fontFamily | `'Inter Variable', system-ui, sans-serif` |  | Default body font stack |
| `font-serif` | fontFamily | `'Source Serif 4 Variable', serif` |  | Serif font stack |
| `font-mono` | fontFamily | `'JetBrains Mono Variable', ui-monospace, monospace` |  | Monospace font stack |
| `font-display` | fontFamily | `'Inter Variable', system-ui, sans-serif` |  | Display/heading font (often more dramatic) |
| `text-xs` | length | `12px` |  | Extra-small text |
| `text-sm` | length | `14px` |  | Small text |
| `text-base` | length | `16px` |  | Default body text size |
| `text-lg` | length | `18px` |  | Large text |
| `text-xl` | length | `20px` |  | Extra-large text |
| `text-2xl` | length | `24px` |  | Heading size |
| `text-3xl` | length | `30px` |  | Heading size |
| `text-4xl` | length | `36px` |  | Display size |
| `text-5xl` | length | `48px` |  | Display size |
| `text-6xl` | length | `60px` |  | Hero display size |
| `font-weight-light` | number | `300` |  | Light weight |
| `font-weight-normal` | number | `400` |  | Regular weight |
| `font-weight-medium` | number | `500` |  | Medium weight |
| `font-weight-bold` | number | `700` |  | Bold weight |
| `font-weight-black` | number | `900` |  | Black weight (brutalist/display) |
| `leading-tight` | number | `1.25` |  | Tight line-height |
| `leading-normal` | number | `1.5` |  | Default line-height |
| `leading-relaxed` | number | `1.625` |  | Relaxed line-height |
| `tracking-tight` | length | `-0.02em` |  | Tight letter-spacing |
| `tracking-normal` | length | `0em` |  | Default letter-spacing |
| `tracking-wide` | length | `0.05em` |  | Wide letter-spacing |

## Spacing

| Token | Type | Default | Required | Description |
|---|---|---|---|---|
| `spacing` | length | `0.25rem` |  | Base spacing unit; the whole scale is calc(spacing * n) |

## Effects

| Token | Type | Default | Required | Description |
|---|---|---|---|---|
| `blur-sm` | length | `8px` |  | Small blur / backdrop-blur |
| `blur-md` | length | `12px` |  | Medium blur / backdrop-blur (glassmorphism) |
| `blur-lg` | length | `16px` |  | Large blur / backdrop-blur |
| `gradient-primary` | gradient | `linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)` |  | Optional gradient for primary surfaces |
| `opacity-disabled` | number | `0.5` |  | Opacity for disabled elements |
| `opacity-overlay` | number | `0.6` |  | Opacity for overlay scrims |

## Motion

| Token | Type | Default | Required | Description |
|---|---|---|---|---|
| `duration-fast` | number | `80` |  | Fast transition (ms) |
| `duration-default` | number | `200` |  | Default transition (ms) |
| `duration-slow` | number | `400` |  | Slow transition (ms) |
| `ease-default` | easing | `cubic-bezier(0.4, 0, 0.2, 1)` |  | Default easing curve |
| `ease-snappy` | easing | `cubic-bezier(0.2, 0, 0, 1)` |  | Snappy easing |
| `ease-smooth` | easing | `cubic-bezier(0.65, 0, 0.35, 1)` |  | Smooth easing |
| `ease-bounce` | easing | `cubic-bezier(0.68, -0.55, 0.27, 1.55)` |  | Playful overshoot easing |
