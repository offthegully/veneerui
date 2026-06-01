# Veneer × Expo — theming proof-of-concept

A scoped spike answering: **can Veneer drive a React Native / Expo app — using the same
semantic utilities as the web (`bg-primary`, `text-text`, `rounded-md`) — and re-skin at
runtime?** Answer: **yes.** One component tree re-skins between Veneer themes on a tap,
through NativeWind's `VariableContextProvider`, with every token value generated from the
same source Veneer ships.

## What this proves

1. **Veneer's token data ports cleanly.** A codegen (`npm run gen:tokens`) reads Veneer's
   published artifacts — `tokens.css`, `theme-v1.json`, builtin `*.json` — and resolves
   every theme exactly as Veneer's `tokenValue()` does (`override ?? schema default`). All
   **13** builtin themes become RN token maps. Nothing is hand-typed, so the app can't
   drift from upstream. (It caught two values an earlier hand-copy had wrong.)
2. **Veneer's semantic utilities work in RN with runtime theme switching.** `bg-primary`,
   `text-text`, `border-border`, `rounded-md` compile to runtime CSS-variable references,
   and `<VariableContextProvider>` swaps them live — *the same authoring model as the web*.
   Verified on **web** (rendered, computed styles change on toggle) and **native** (the
   compiled iOS descriptors are `var` bindings — `bg-primary → var(--color-primary)` — not
   inlined literals).

## The two things that make NativeWind's runtime theming actually work

These are non-obvious and cost most of the spike — get either wrong and color utilities
silently render static/transparent:

1. **Use the granular, layered Tailwind v4 imports — not the bundle.** `global.css` must
   start with
   ```css
   @import "tailwindcss/theme.css" layer(theme);
   @import "tailwindcss/preflight.css" layer(base);
   @import "tailwindcss/utilities.css";
   @import "nativewind/theme";
   ```
   With the shorthand `@import "tailwindcss";`, NativeWind **inlines** the `@theme` color
   values and the generated utilities lose their `var()` reference — so the provider can't
   reach them. (Verified: with the bundle, `bg-primary` is transparent/static; with the
   layered form it emits `.bg-primary { background-color: var(--color-primary) }` and swaps.)
2. **Declare every themeable token in both `@theme` and `:root`.** `@theme` generates the
   utility; `:root` supplies the *runtime default* the provider overrides. Veneer's web
   `tokens.css` can keep colors only in `@theme` (the browser's `@theme` also emits a
   `:root` var) — NativeWind's compiler does not, so the codegen repeats theme-bridge
   tokens into `:root`.

Both are handled automatically by `npm run gen:tokens`.

## How the Veneer model maps onto this app

| Veneer (web) | This POC (Expo) | File |
| --- | --- | --- |
| `tokens.css` (`@theme` + `:root`) | generated, with the layered imports + tokens in both blocks | `global.css` |
| theme JSON resolved by `tokenValue()` | generated `THEME_TOKENS` (all 13, fully resolved) | `src/veneer-themes.generated.ts` |
| `applyTheme()` writes vars on `document.documentElement` | `toCssVars(themeId)` → `<VariableContextProvider value>` | `App.tsx` |
| semantic utilities `bg-primary`, `rounded-md` | **same classes**, var-backed, swapped by the provider | `App.tsx` |
| `root`-bridge tokens via `var()` (shadow, border width — no utility namespace) | read off the map → inline `style` | `App.tsx` |
| `localStorage` + anti-flash script | *(not ported — would be `AsyncStorage` + splash)* | — |

## Generate the tokens

```bash
npm run gen:tokens     # reads ../../packages/theme, writes global.css + veneer-themes.generated.ts
```

Both outputs are committed and marked do-not-edit. Re-run after changing any upstream
Veneer theme — the app re-derives instead of drifting.

## Run it

```bash
npm install            # --legacy-peer-deps if npm complains about the react-dom peer
npm start              # press i (iOS) / a (Android), or scan with Expo Go
npm run web            # runs in the browser (how the swap was verified)
```

Tap **Primary action**, or the **Light / Dark / Brutalist / …** switcher, and watch color,
corner radius, border weight and shadow re-skin live.

## Stack

- Expo SDK 56 (React Native 0.85, New Architecture); web via `react-native-web`
- NativeWind `5.0.0-preview.4` + `react-native-css` 3 (the v5 line targets Tailwind v4)
- Tailwind CSS v4 via `@tailwindcss/postcss`
- `lightningcss` pinned to `1.30.1` (known v5-preview build gotcha — see `package.json`
  `overrides`)

## Verification done

- **Codegen:** 112 tokens × 13 themes resolved; output is deterministic (CI-diffable).
- **Types:** `npm run typecheck` (`tsc --noEmit`) — clean.
- **Bundles:** Metro builds iOS (`dev` + `dev=false`) and web — all HTTP 200; the full
  112-token `global.css` (incl. `color-mix()`, nested-`var()` gradients) compiles cleanly.
- **Runtime swap, web (Playwright render):** toggling Light → Brutalist via the className
  tree changed computed styles — primary `rgb(59,130,246)` → `rgb(255,77,0)`, accent
  `rgb(6,182,212)` → `rgb(0,229,255)`, radius `8px` → `0px`. The compiled CSS contains
  `.bg-primary { background-color: var(--color-primary) }`.
- **Runtime swap, native (iOS bundle inspection):** themed utilities compile to runtime
  `var` descriptors (`bg-primary → ["var","color-primary"]→backgroundColor`,
  `rounded-md → ["var","radius-md"]→borderRadius`), so the provider override reaches them —
  the same mechanism, confirmed off-device.

## Caveats / next steps if productionized

- NativeWind v5 is still **pre-release**. The `expo export` *production* serializer trips a
  tree-shaking assertion on `react-native-css`'s `.cjs` chunk (a v5-preview quirk, not this
  app); the dev-server path `npm start` uses bundles cleanly. Re-check on v5 stable, or
  evaluate [Uniwind](https://uniwind.dev/).
- Port persistence (`AsyncStorage`) + a splash-screen anti-flash equivalent.
- The switcher shows only the 5 themes that survive RN's lack of blur / gradients / layered
  shadows; the other 8 are generated but would degrade.
- The Veneer **components** (HTML `<div>`-based registry) are *not* ported — only the
  theming. Components would need RN-primitive equivalents that consume the same classes.
