---
"@offthegully/veneerui": minor
---

Add per-status on-fill text tokens: `color-text-on-success`, `color-text-on-warning`,
`color-text-on-danger`, `color-text-on-info` (utilities `text-text-on-success` etc.).

Previously `color-text-on-primary` was the *only* on-fill text token, shared across
`bg-primary` and every status fill — so a `bg-danger` surface couldn't take a
different foreground than a pale `bg-primary` without reaching for a literal. Each
status fill now has its own on-color, defaulted to contrast (WCAG) with that
status's default fill: dark on the default green/amber/sky, white on the default
red. The built-in themes set overrides where their fill's lightness flips the
choice (e.g. pale `glassmorphic`/`neumorphic`/`default-dark` danger → dark text;
deep `editorial`/`warm-library` success/warning/info → light text). `color-text-on-primary`
is unchanged.
