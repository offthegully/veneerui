<!-- AUTO-GENERATED from packages/theme/src/schema.ts by scripts/generate-theme.ts — do not edit. -->

# Theme Token Reference

Schema generation **1** · **112** tokens. Set any of these in a theme's `tokens` object; omitted tokens fall back to the default.

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
| `color-text-muted` | color | `#4b5563` |  | Secondary text |
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
| `radius-xs` | length | `2px` |  | Hairline rounding |
| `radius-sm` | length | `4px` |  | Small radius |
| `radius-md` | length | `8px` |  | Default radius for cards, buttons |
| `radius-lg` | length | `12px` |  | Large radius |
| `radius-xl` | length | `16px` |  | Extra-large radius |
| `radius-2xl` | length | `24px` |  | Very large radius (neumorphic) |
| `radius-3xl` | length | `32px` |  | Pillowy radius for soft/playful themes |
| `radius-full` | length | `9999px` |  | Pill / fully rounded |

## Shadows

| Token | Type | Default | Required | Description |
|---|---|---|---|---|
| `shadow-2xs` | shadow | `0 1px rgb(0 0 0 / 0.05)` |  | Faintest hairline elevation |
| `shadow-sm` | shadow | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |  | Subtle elevation |
| `shadow-md` | shadow | `0 4px 6px -1px rgb(0 0 0 / 0.1)` |  | Default elevation |
| `shadow-lg` | shadow | `0 10px 15px -3px rgb(0 0 0 / 0.1)` |  | High elevation |
| `shadow-xl` | shadow | `0 20px 25px -5px rgb(0 0 0 / 0.1)` |  | Highest elevation |
| `shadow-2xl` | shadow | `0 25px 50px -12px rgb(0 0 0 / 0.25)` |  | Dramatic floating elevation |
| `shadow-card` | shadow | `0 1px 3px 0 rgb(0 0 0 / 0.1)` |  | Semantic alias for card elevation |
| `shadow-glow` | shadow | `0 0 20px color-mix(in srgb, var(--color-primary) 45%, transparent)` |  | Glow for retro/playful themes (follows the palette) |
| `inset-shadow-sm` | shadow | `inset 0 2px 4px rgb(0 0 0 / 0.06)` |  | Small inset (neumorphic) |
| `inset-shadow-md` | shadow | `inset 0 3px 6px rgb(0 0 0 / 0.09)` |  | Medium inset (neumorphic) |
| `inset-shadow-lg` | shadow | `inset 0 4px 8px rgb(0 0 0 / 0.12)` |  | Large inset (neumorphic) |
| `text-shadow-sm` | textShadow | `0 1px 2px rgb(0 0 0 / 0.1)` |  | Subtle text depth |
| `text-shadow-md` | textShadow | `0 2px 4px rgb(0 0 0 / 0.12)` |  | Default text depth |
| `text-shadow-lg` | textShadow | `0 4px 8px rgb(0 0 0 / 0.15)` |  | Strong text depth (display headings) |
| `text-shadow-glow` | textShadow | `0 0 12px color-mix(in srgb, var(--color-primary) 55%, transparent)` |  | Neon glow on text (retro/synthwave; follows the palette) |
| `drop-shadow-sm` | dropShadow | `0 1px 1px rgb(0 0 0 / 0.1)` |  | Subtle alpha-aware shadow |
| `drop-shadow-md` | dropShadow | `0 3px 4px rgb(0 0 0 / 0.15)` |  | Default alpha-aware shadow (glass/cutout) |
| `drop-shadow-lg` | dropShadow | `0 8px 12px rgb(0 0 0 / 0.2)` |  | Deep alpha-aware shadow |

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
| `text-7xl` | length | `72px` |  | Oversized display |
| `text-8xl` | length | `96px` |  | Editorial poster size |
| `text-9xl` | length | `128px` |  | Maximal hero size |
| `font-weight-thin` | number | `100` |  | Thin weight (fashion/editorial) |
| `font-weight-light` | number | `300` |  | Light weight |
| `font-weight-normal` | number | `400` |  | Regular weight |
| `font-weight-medium` | number | `500` |  | Medium weight |
| `font-weight-semibold` | number | `600` |  | Semibold weight |
| `font-weight-bold` | number | `700` |  | Bold weight |
| `font-weight-extrabold` | number | `800` |  | Extra-bold weight |
| `font-weight-black` | number | `900` |  | Black weight (brutalist/display) |
| `leading-tight` | number | `1.25` |  | Tight line-height |
| `leading-snug` | number | `1.375` |  | Snug line-height |
| `leading-normal` | number | `1.5` |  | Default line-height |
| `leading-relaxed` | number | `1.625` |  | Relaxed line-height |
| `leading-loose` | number | `2` |  | Loose line-height (airy editorial) |
| `tracking-tighter` | length | `-0.05em` |  | Very tight letter-spacing (display) |
| `tracking-tight` | length | `-0.02em` |  | Tight letter-spacing |
| `tracking-normal` | length | `0em` |  | Default letter-spacing |
| `tracking-wide` | length | `0.05em` |  | Wide letter-spacing |
| `tracking-wider` | length | `0.1em` |  | Wider letter-spacing |
| `tracking-widest` | length | `0.2em` |  | Widest letter-spacing (eyebrow/label) |

## Spacing

| Token | Type | Default | Required | Description |
|---|---|---|---|---|
| `spacing` | length | `0.25rem` |  | Base spacing unit; the whole scale is calc(spacing * n) |

## Effects

| Token | Type | Default | Required | Description |
|---|---|---|---|---|
| `blur-xs` | length | `4px` |  | Hairline blur / backdrop-blur |
| `blur-sm` | length | `8px` |  | Small blur / backdrop-blur |
| `blur-md` | length | `12px` |  | Medium blur / backdrop-blur (glassmorphism) |
| `blur-lg` | length | `16px` |  | Large blur / backdrop-blur |
| `blur-xl` | length | `24px` |  | Extra-large blur / backdrop-blur |
| `blur-2xl` | length | `40px` |  | Frosted-glass blur / backdrop-blur |
| `gradient-primary` | gradient | `linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)` |  | Optional gradient for primary surfaces (follows the palette) |
| `gradient-accent` | gradient | `linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 100%)` |  | Gradient for accent/secondary surfaces (follows the palette) |
| `gradient-surface` | gradient | `linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-sunken) 100%)` |  | Subtle background gradient for page/hero (follows the palette) |
| `gradient-text` | gradient | `linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)` |  | Gradient for clipped headline text (follows the palette) |
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
