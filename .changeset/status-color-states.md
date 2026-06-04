---
"@offthegully/veneerui": minor
---

Promote the status colors to first-class interactive roles: add `-hover`,
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
