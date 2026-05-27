# Veneer Theme Gallery

A collection of ready-to-use themes for [Veneer](../README.md). Each lives in
`themes/<slug>/` as a `theme.json` (the theme itself) plus a `notes.md`
explaining the design choices.

These are also **the starting templates for authoring your own** — every one is a
fully-realized example of a different design language, not a stub.

> This directory is structured to become a standalone public GitHub repo in
> Phase 4, where browsing and PR-based contribution land. For now it ships inside
> the app repo as the seed set.

## Themes

| Theme | Slug | Style |
|---|---|---|
| Brutalist | `brutalist` | Thick black borders, 0 radii, hard offset shadows |
| Neumorphic | `neumorphic` | Soft extruded UI, paired light/dark shadows |
| Glassmorphic | `glassmorphic` | Translucent frosted panels, backdrop blur, drop shadows |
| Editorial | `editorial` | Serif display, enlarged scale, magazine rhythm |
| High Contrast | `high-contrast` | Black-on-white accessibility theme |
| Sunset Paper | `sunset-paper` | Warm cream paper, sunset gradient, playful motion |
| Neon Arcade | `neon-arcade` | Synthwave neon, glowing text, gradient headlines |
| Terminal | `terminal` | CRT phosphor: all-monospace, scanlines, glowing green |
| Windows 95 | `windows-95` | Battleship-gray bevels, square corners, instant motion |

## Using a theme

1. Open the app and click the theme switcher → **Manage themes**.
2. Either:
   - **Download** a `theme.json` and drop it into the import panel, or
   - **Copy its raw URL** (the `raw.githubusercontent.com` link once this is a
     GitHub repo) and paste it into the URL field.
3. The app validates it locally and applies it as a **live preview**. If you like
   it, click **Save to library**; otherwise **Stop preview**.

Nothing is uploaded and there is no account — your library lives in your browser.

## Authoring your own

Copy the `theme.json` closest to what you want and edit it — anything you omit
falls back to its default, so you only change what differs. See the
[authoring guide](../docs/authoring-guide.md)
for how to pick a coherent palette and the [token reference](../docs/schema-reference.md)
for every token you can set. Add `"$schema": "https://veneer.app/schemas/theme-v1.json"`
to the top of your file for editor autocomplete and inline validation.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
