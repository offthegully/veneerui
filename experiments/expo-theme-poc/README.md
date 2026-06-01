# Veneer × Expo — theming proof-of-concept

A scoped spike proving that **Veneer's theming model works in a React Native / Expo app**
via NativeWind v5. One component tree re-skins between two Veneer themes
(`default-light` ↔ `brutalist`) at runtime — no rebuild — driven by the exact same token
JSON Veneer ships on the web.

## What this proves (and what it doesn't)

**Proves:** Veneer is built on Tailwind v4's `@theme` + CSS-variable model, and that model
is *the same one* NativeWind v5 uses for dynamic themes. So Veneer's token vocabulary and
theme data port directly. Every semantic utility compiles to a CSS variable
(`bg-primary → background-color: var(--color-primary)`), and swapping the variable map at
runtime re-skins the tree.

**Doesn't prove pixel-parity:** React Native has no real `box-shadow`/gradients/blur, so
Veneer's effect-heavy themes (Glassmorphic, Neumorphic, Neon Arcade) would degrade. This
POC uses color / radius / border-width / a basic shadow — the axes that port cleanly.

## How the Veneer model maps onto React Native

| Veneer (web) | This POC (Expo) | File |
| --- | --- | --- |
| `@theme` generates utilities + `:root` defaults | identical — `@theme` + `:root` | `global.css` |
| `applyTheme()` writes vars onto `document.documentElement` | `<VariableContextProvider value={…}>` | `App.tsx` |
| theme JSON (`builtin/*.json`) | the same maps as plain data | `src/veneer-themes.ts` |
| `theme` bridge tokens → `bg-primary`, `rounded-md` | same `className` utilities | `App.tsx` |
| `root` bridge tokens via `var()` (shadow, border-width) | read from the map → inline `style` | `App.tsx` |
| `localStorage` + anti-flash script | *(not ported — would be `AsyncStorage` + splash)* | — |

Token values in `src/veneer-themes.ts` are lifted verbatim from the Veneer repo
(`packages/theme/src/builtin/{default-light,brutalist}.json` merged over the
`packages/theme/src/schema.ts` defaults — the same `theme.tokens[name] ?? default`
resolution Veneer's `tokenValue()` does).

## Run it

```bash
cd experiments/expo-theme-poc
npm install
npm start          # then press i (iOS) / a (Android), or scan with Expo Go
```

Tap **Primary action** or the **light / brutalist** switcher and watch color, corner
radius, border weight and shadow change live.

## Stack

- Expo SDK 56 (React Native 0.85, New Architecture)
- NativeWind `5.0.0-preview.4` + `react-native-css` 3 (the v5 line targets Tailwind v4)
- Tailwind CSS v4 via `@tailwindcss/postcss` (see `postcss.config.mjs`)
- `lightningcss` pinned to `1.30.1` (known v5-preview build gotcha — see `package.json`
  `overrides`)

## Verification done

- `npm run typecheck` (`tsc --noEmit`) — clean.
- Tailwind compile of `global.css` — confirmed the Veneer utilities generate and each
  resolves to `var(--color-*)` / `var(--radius-*)` (so the runtime swap reaches them).
- Full Metro dev bundle (`/index.bundle?platform=ios`) — HTTP 200, ~5 MB, NativeWind
  embedded the token styles and both themes' values; `VariableContextProvider` wired in.

> Note: `npx expo export` (the production serializer) currently trips a tree-shaking
> assertion on `react-native-css`'s `.cjs` chunk — a NativeWind-v5-**preview** quirk, not a
> problem with this app. The dev-server path that `npm start` uses bundles cleanly. As the
> docs state, NativeWind v5 is pre-release and not yet production-recommended; for a
> production app today, evaluate [Uniwind](https://uniwind.dev/) (stable Tailwind v4 +
> `@theme`) as the alternative engine.

## Caveats / next steps if productionized

- Replace the inline-style root-bridge handling with a small hook if the set grows.
- Port persistence (`AsyncStorage`) + a splash-screen anti-flash equivalent.
- Decide how the effect-heavy themes degrade (RN shadow/gradient/blur substitutes).
- The Veneer **components** (HTML `<div>`-based, copy-paste registry) are *not* ported —
  only the theming engine. Components would need RN-primitive equivalents.
