# Veneer on React Native / Expo (experimental)

Veneer's theming runs on native through **NativeWind v5** (Tailwind v4 for React
Native). You write the **same semantic utilities as the web** — `bg-primary`,
`text-text`, `rounded-md` — and the **same theme JSON** drives both; switching a theme
re-skins the tree at runtime.

> **Status: experimental.** NativeWind v5 is pre-release. `npm create veneerui` and the
> `veneerui` CLI are **web-only** (Vite / Next) today — there's no `--framework expo`, so
> on native you wire it with the steps below. A complete, verified reference app lives in
> [`experiments/expo-theme-poc`](../experiments/expo-theme-poc).

## Two ways in

### Option A — new app: copy the working POC (fastest)

The proof-of-concept *is* a runnable Expo app. Copy it and go:

```sh
npx degit offthegully/veneerui/experiments/expo-theme-poc my-app
cd my-app
npm install            # add --legacy-peer-deps if npm flags the react-dom peer
npm run gen:tokens     # (re)generate the token maps from Veneer's published tokens
npm start              # press i / a, or scan with Expo Go;  npm run web for the browser
```

Tap the switcher, watch it re-skin, then build your screens with the token utilities.

### Option B — add to an existing Expo app

**1. Install** (Expo SDK 56+, React 19):

```sh
npx expo install nativewind react-native-css react-native-reanimated \
  react-native-worklets react-native-safe-area-context
npm i -D tailwindcss @tailwindcss/postcss
```

Wire `metro.config.js` (`withNativewind`) and `babel-preset-expo` — copy both from the
POC (and its `lightningcss` pin).

**2. `global.css`** — mind [the two gotchas](#the-two-gotchas) below, then generate it
from Veneer's published tokens with the POC's `scripts/generate-veneer-tokens.mjs`
(`npm run gen:tokens`) — it reads `@offthegully/veneerui`'s `tokens.css` + theme JSON, so
nothing is hand-copied.

**3. Switch themes** with NativeWind's provider — the RN analogue of `applyTheme()`:

```tsx
import { VariableContextProvider } from "nativewind";

<VariableContextProvider value={themeTokenMap /* { "--color-primary": "#ff4d00", … } */}>
  <View className="bg-primary rounded-md p-4">
    <Text className="text-text-on-primary">Re-skins live</Text>
  </View>
</VariableContextProvider>
```

Feed it a Veneer theme's resolved token map; change the map to switch themes.

## The two gotchas

Get either wrong and the color utilities silently render static. `npm run gen:tokens`
handles both — this is what it emits:

```css
/* 1. Granular, layered imports — NOT `@import "tailwindcss"`. The bundle inlines the
      @theme colors, so the utilities lose their var() and can't be swapped. */
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css";
@import "nativewind/theme";

/* 2. Every token in BOTH blocks — @theme generates the utility, :root is the runtime
      default the provider overrides. */
@theme { --color-primary: #3b82f6; /* … */ }
:root  { --color-primary: #3b82f6; /* … */ }
```

Colors and radius swap through the className utilities; tokens with no Tailwind utility
(border width, shadows) are applied via inline `style` from the token map — exactly how
Veneer uses `var()` on the web.

## What ports, what doesn't

- **Ports cleanly** — color, radius, border width, type, spacing, simple shadows. Same
  token JSON, same classes.
- **Degrades** — effect-heavy themes (glassmorphic / neumorphic / neon): RN has no CSS
  blur, gradients, or layered shadows.
- **Not ported** — Veneer's components (HTML `<div>`-based). Build RN primitives
  (`View` / `Text` / `Pressable`) that use the same token classes.
