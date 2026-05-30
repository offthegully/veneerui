<!-- AUTO-GENERATED from packages/theme/src/schema.ts by scripts/generate-theme.ts — do not edit. -->

# Fonts

A theme can only **name** a font; it can never load one (the validator blocks
`url()`, so a theme is inert data). That means **the app is responsible for
loading every family its themes name** — and the family string in the theme
must match a loaded font *exactly*. This is the one genuinely fiddly part of
adoption, so the rules are spelled out below.

## The one that bites everyone: `font-sans`

Body text must be driven by the **`font-sans` token** (the `font-sans` utility,
or letting it inherit). If you force a font the framework supplies — e.g.
Next's `next/font` via `<body className={geist.className}>` — that hard-coded
family wins over the token and **silently defeats all font theming**. Drop the
framework font class from `<body>` and let `font-sans` flow through.

Veneer's own default `font-sans` is `'Inter Variable'`; if you never load Inter
(see below) even the built-in themes fall back to system-ui. Run `veneerui add
fonts` to load the full bundled set.

## Bundled families ↔ Fontsource packages

Themes may only name the families below (case-insensitive) plus the CSS generic
keywords. The reliable way to load each is its [Fontsource](https://fontsource.org)
package — the family name a theme uses must match Fontsource's, which is why the
mapping is exact:

| Family (+ aliases) | Install | Import |
|---|---|---|
| `Inter Variable`, `Inter` | `npm i @fontsource-variable/inter` | `@fontsource-variable/inter` |
| `Source Serif 4 Variable`, `Source Serif 4` | `npm i @fontsource-variable/source-serif-4` | `@fontsource-variable/source-serif-4` |
| `JetBrains Mono Variable`, `JetBrains Mono` | `npm i @fontsource-variable/jetbrains-mono` | `@fontsource-variable/jetbrains-mono` |
| `Fraunces Variable`, `Fraunces` | `npm i @fontsource-variable/fraunces` | `@fontsource-variable/fraunces` |
| `Archivo Black` | `npm i @fontsource/archivo-black` | `@fontsource/archivo-black` |
| `Orbitron Variable`, `Orbitron` | `npm i @fontsource-variable/orbitron` | `@fontsource-variable/orbitron` |
| `Quicksand Variable`, `Quicksand` | `npm i @fontsource-variable/quicksand` | `@fontsource-variable/quicksand` |
| `EB Garamond Variable`, `EB Garamond` | `npm i @fontsource-variable/eb-garamond` | `@fontsource-variable/eb-garamond`<br>`@fontsource-variable/eb-garamond/wght-italic.css` |
| `IBM Plex Mono` | `npm i @fontsource/ibm-plex-mono` | `@fontsource/ibm-plex-mono/400.css`<br>`@fontsource/ibm-plex-mono/500.css`<br>`@fontsource/ibm-plex-mono/600.css`<br>`@fontsource/ibm-plex-mono/400-italic.css` |
| `MS Sans Serif` | — (self-hosted) | Windows 95 theme — self-host the face; not on Fontsource. |

`veneerui add fonts` prints the install command and import lines for the whole
set. Import the specifiers in your app entry (Vite: `src/main.tsx`; Next: the
root `layout.tsx` or your global CSS via `@import`). Variable packages ship one
file; static ones (IBM Plex Mono) need a line per weight.
