# Veneer Theme Gallery

A collection of ready-to-use themes for [Veneer](../README.md). Each lives in
`themes/<slug>/` as a `theme.json` (the theme itself) plus a `notes.md`
explaining the design choices.

These are also **the starting templates for authoring your own** — every one is a
fully-realized example of a different design language, not a stub.

> Today these ship inside the app repo as the seed set. When the gallery moves to
> its own public repo, each `theme.json` will also be importable by its raw URL.

## Themes

| Theme | Slug | Style |
|---|---|---|
| Editorial | `editorial` | Serif display, enlarged scale, magazine rhythm |
| Warm Library | `warm-library` | EB Garamond throughout, cream paper, terracotta + sage |
| Sunset Paper | `sunset-paper` | Warm cream paper, sunset gradient, playful motion |
| Monospaced | `monospaced` | IBM Plex Mono on amber paper, flat-print elevation |
| Neumorphic | `neumorphic` | Soft extruded UI, paired light/dark shadows |
| High Contrast | `high-contrast` | Black-on-white accessibility theme |
| Brutalist | `brutalist` | Thick black borders, 0 radii, hard offset shadows |
| Windows 95 | `windows-95` | Battleship-gray bevels, square corners, instant motion |
| Glassmorphic | `glassmorphic` | Translucent frosted panels, backdrop blur, drop shadows |
| Terminal | `terminal` | CRT phosphor: all-monospace, scanlines, glowing green |
| Neon Arcade | `neon-arcade` | Synthwave neon, glowing text, gradient headlines |

## Using a theme

Every gallery theme ships in the package as part of `BUILTIN_THEMES` (`npm run
gen:builtin` vendors this folder in), so in the app it's already there: open the
theme switcher → **Browse gallery** and apply it by look. In your own app, pass
the set (or your own subset) to `<ThemeProvider themes={...}>`.

Nothing is uploaded and there is no account — only your chosen theme is
remembered in your browser.

## Authoring your own

Copy the `theme.json` closest to what you want and edit it — anything you omit
falls back to its default, so you only change what differs. See the
[authoring guide](../docs/authoring-guide.md)
for how to pick a coherent palette and the [token reference](../docs/schema-reference.md)
for every token you can set. Add `"$schema": "https://veneerui.dev/schemas/theme-v1.json"`
to the top of your file for editor autocomplete and inline validation.

The token list is a closed vocabulary, but an *app* can declare colors outside it
in the reserved **`color-x-*`** namespace; a gallery theme may recolor them but
needn't declare any. See
[Custom colors](../docs/authoring-guide.md#4-custom-colors-beyond-the-schema-palette)
in the authoring guide.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
