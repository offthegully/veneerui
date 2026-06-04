---
"@offthegully/veneerui": minor
---

Remove the `shuffleUntilPinned` showcase feature to slim the theming runtime down
to its core guarantee — apply the persisted-or-default theme before first paint,
with no flash.

Removed: the `shuffleUntilPinned` option on `veneer()` (Vite) and `<AntiFlashScript>`
(Next), the `shuffleIds` prop on `<ThemeProvider>`, `useTheme().pinned` and
`useTheme().shuffle()`, the `SHUFFLE_ATTR` / `ShuffleTheme` exports, the `pinned`
field on `ThemeLibrary`, and the second (`shufflePool`) argument of
`getAntiFlashScript`. The no-flash behavior and theme persistence are unchanged —
selecting a theme in the switcher works exactly as before. Apps that opted into
shuffle should drop those props/usages.
