# Veneer on React Native / Expo (experimental)

Veneer's theming runs on native through **NativeWind v5** (Tailwind v4 for React
Native). You write the **same semantic utilities as the web** — `bg-primary`,
`text-text`, `rounded-md` — and the **same theme JSON** drives both; switching a theme
re-skins the tree at runtime.

> **Status: experimental.** NativeWind v5 is pre-release, so expect rough edges. The
> `veneerui` CLI (`init`, for *existing* apps) is still web-only; Expo support is in the
> **new-app scaffolder** — the templates it writes live in
> [`packages/setup-core/assets/expo/`](../packages/setup-core/assets/expo).
>
> **Known issue — version drift with the latest Expo SDK.** The scaffolder delegates
> to `create-expo-app@latest`, which now produces **Expo SDK 56 / React Native 0.85**,
> but the pinned `nativewind@5.0.0-preview.4` + `react-native-css@3.0.7` (the newest
> published preview) don't yet bundle on that Metro — `expo export`/run fails with
> `AssertionError: Chunk containing module not found: …/react-native-css/…/index.cjs`.
> Until NativeWind v5 supports RN 0.85, pin the scaffold to a **tested Expo SDK** (the
> SDK the templates were validated against) rather than `@latest`. Always run the
> Expo smoke test end-to-end (it must actually scaffold Expo — see the `--` separator
> note in [integration.md](./integration.md#new-app)) when bumping any of these pins.

## Two ways in

### Option A — new app: scaffold it (recommended)

```sh
npm create veneerui@latest my-app -- --framework expo
cd my-app
npm start          # press i (iOS) / a (Android), or scan with Expo Go
```

This delegates to `create-expo-app`, then wires Veneer: the NativeWind + Tailwind v4
config, a token codegen, a `ThemeProvider` + `ThemeSwitcher`, and a token-driven starter
screen — and runs `npm run gen:tokens` so it boots themed. Tap the switcher and watch it
re-skin; build screens from the token utilities (see the app's `AGENTS.md`).

### Option B — add to an existing Expo app

**1. Install** (Expo SDK 56+, React 19):

```sh
npx expo install nativewind react-native-css react-native-reanimated \
  react-native-worklets react-native-safe-area-context
npm i -D tailwindcss @tailwindcss/postcss
```

Wire `metro.config.js` (`withNativewind`) and `babel-preset-expo` — copy both from the
scaffolder's templates in [`packages/setup-core/assets/expo/`](../packages/setup-core/assets/expo)
(and its `lightningcss` pin).

**2. `global.css`** — mind [the two gotchas](#the-two-gotchas) below, then generate it
from Veneer's published tokens with the scaffolder's `scripts/generate-veneer-tokens.mjs`
(`npm run gen:tokens`) — it reads `@offthegully/veneerui`'s published `TOKEN_SCHEMA` +
`BUILTIN_THEMES`, so nothing is hand-copied.

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
  token JSON, same classes. Custom `color-x-*` colors port too — declare them in
  your base theme and consume them via `var()` (`bg-(--color-x-gold)`); see the
  [authoring guide](./authoring-guide.md#4-custom-colors-beyond-the-schema-palette).
- **Degrades** — effect-heavy themes (glassmorphic / neumorphic / neon): RN has no CSS
  blur, gradients, or layered shadows.
- **Not ported** — Veneer's components (HTML `<div>`-based). Build RN primitives
  (`View` / `Text` / `Pressable`) that use the same token classes.
