# Veneer × Expo — theming proof-of-concept

A scoped spike answering: **can Veneer's theming drive a React Native / Expo app, and
re-skin at runtime?** One component tree re-skins between Veneer themes
(`default-light` ↔ `brutalist` ↔ `dark` ↔ …) on a button tap — and every token value
comes from the *same source of truth Veneer ships*, generated, never hand-copied.

## What this proves

1. **Veneer's token data ports perfectly.** A codegen (`npm run gen:tokens`) reads
   Veneer's published artifacts — `tokens.css`, `theme-v1.json`, and the builtin
   `*.json` themes — and resolves every theme exactly as Veneer's `tokenValue()` does
   (`override ?? schema default`). All **13** builtin themes become a flat RN token map.
   Nothing is hand-typed, so the app can't silently drift from upstream. (It already
   caught two values an earlier hand-copy had gotten wrong.)
2. **A live RN tree re-skins at runtime from that data** — verified by rendering on web
   and toggling: color, corner radius, border weight and shadow all change (see
   *Verification*).

## The key finding (and why the app looks the way it does)

We first built this on NativeWind v5's documented dynamic-theme mechanism — generate
utilities from `@theme`, override `--vars` at runtime with `<VariableContextProvider>`.
**In the NativeWind v5 _preview_ on Expo SDK 56, that path does not work for color
utilities.** Rendered on web, `bg-primary` / `text-*` / `border-*` compute to
*transparent / default* — they never resolve their CSS variable — even though the
provider correctly sets `--color-primary` on the root. Layout utilities (`flex`, `p-5`,
`gap-4`) and inline styles work fine; the `className → var()` **color** path doesn't.

So this POC drives **every themed value through a plain JS theme object applied as inline
`style`** (`palette(themeId)` in `src/veneer-themes.ts`). That re-skins on the ordinary
React re-render and is engine-independent. The token **data** still comes straight from
Veneer via the codegen — only the *application* mechanism changed.

> This corrects the initial research note, which assumed NativeWind's provider swap
> would carry Veneer's themes. It compiles and the variables are set, but the generated
> color utilities don't consume them in the preview. For the `className → var` path,
> re-evaluate once NativeWind v5 is stable, or try [Uniwind](https://uniwind.dev/).

## How the Veneer model maps onto this app

| Veneer (web) | This POC (Expo) | File |
| --- | --- | --- |
| `tokens.css` (`@theme` + `:root`) | generated verbatim → used for layout utils only | `global.css` |
| theme JSON (`builtin/*.json`) resolved by `tokenValue()` | generated `THEME_TOKENS` (all 13, fully resolved) | `src/veneer-themes.generated.ts` |
| `applyTheme()` writes vars on `document.documentElement` | `palette(themeId)` → inline `style={…}`, re-applied on re-render | `App.tsx` |
| `root`-bridge tokens via `var()` (shadow, border width) | read off the token map → inline `style` | `App.tsx` |
| `localStorage` + anti-flash script | *(not ported — would be `AsyncStorage` + splash)* | — |
| NativeWind `@theme` + `<VariableContextProvider>` | present but **not** relied on (see finding above) | — |

## Generate the tokens

```bash
npm run gen:tokens     # reads ../../packages/theme, writes global.css + veneer-themes.generated.ts
```

Both outputs are committed and marked do-not-edit. Re-run after changing any upstream
Veneer theme — that's the whole point: the app re-derives instead of drifting.

## Run it

```bash
npm install            # --legacy-peer-deps if npm complains about the react-dom peer
npm start              # press i (iOS) / a (Android), or scan with Expo Go
npm run web            # runs in the browser (how the swap below was verified)
```

Tap **Primary action**, or the **Light / Dark / Brutalist / …** switcher, and watch the
tree re-skin live.

## Stack

- Expo SDK 56 (React Native 0.85, New Architecture); web via `react-native-web`
- NativeWind `5.0.0-preview.4` + `react-native-css` 3 (used for layout utilities)
- Tailwind CSS v4 via `@tailwindcss/postcss`
- `lightningcss` pinned to `1.30.1` (known v5-preview build gotcha — see `package.json`
  `overrides`)

## Verification done

- **Codegen:** 112 tokens × 13 themes resolved; output is deterministic (CI-diffable).
- **Types:** `npm run typecheck` (`tsc --noEmit`) — clean.
- **Bundles:** Metro builds iOS (`dev` + `dev=false`) and web — all HTTP 200. The full
  112-token `global.css` (incl. `color-mix()`, nested-`var()` gradients) compiles cleanly.
- **Runtime swap (web render, Playwright):** toggling Light → Brutalist changed the
  *computed* styles of the live tree —
  primary `rgb(59,130,246)` → `rgb(255,77,0)`, accent `rgb(6,182,212)` → `rgb(0,229,255)`,
  radius `8px` → `0px`, card border `1px` → `3px`, shadow soft → `#000 4px 4px 0 0`.
  This is the decisive evidence the generated Veneer data re-skins a real RN tree.
- **What does _not_ work (also rendered):** NativeWind's `bg-*`/`text-*`/`border-*` color
  utilities compute to transparent/default in the v5 preview — hence the inline-style
  approach above.

## Caveats / next steps if productionized

- The honest production pattern: keep the **codegen** (token data from Veneer) and apply
  it via a small **JS theme provider** (`palette` → context → inline styles or a
  `styled()` helper), rather than NativeWind's preview-stage var swap.
- Port persistence (`AsyncStorage`) + a splash-screen anti-flash equivalent.
- Decide how the effect-heavy themes degrade — the switcher deliberately shows only the 5
  that survive RN's lack of blur / gradients / layered shadows; the other 8 are generated
  but would look wrong.
- The Veneer **components** (HTML `<div>`-based registry) are *not* ported — only the
  theming. Components would need RN-primitive equivalents that consume `palette()`.
