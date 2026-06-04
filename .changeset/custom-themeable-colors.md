---
"@offthegully/veneerui": minor
---

Add custom themeable colors via the reserved `color-x-*` namespace. Apps can now
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
