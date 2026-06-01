# Agent guide — this Veneer + Expo app

This is a React Native (Expo) app themed by **Veneer** via **NativeWind v5**. You build
screens from Veneer's semantic token utilities — the *same classes as Veneer on the web* —
and the whole tree re-skins at runtime when the theme changes.

## The one rule

**Never hardcode a color or visual value. Drive everything from theme tokens.** No raw
palette utilities (`bg-blue-500`), no arbitrary colors (`bg-[#fff]`), no literal hex.

## How to style

- **Colors, radius, type, spacing** → className utilities: `bg-surface`, `bg-surface-raised`,
  `bg-surface-sunken`, `bg-primary`, `bg-accent`, `text-text`, `text-text-muted`,
  `text-text-on-primary`, `border-border`, `rounded-md`, `rounded-lg`, `font-bold`. These
  resolve CSS variables that the provider swaps — so they re-skin live.
- **Border width & shadows** have no Tailwind utility namespace. Read them off the token
  map and apply inline: `style={{ borderWidth, boxShadow }}` using
  `token(theme, "border-width-default")` / `token(theme, "shadow-card")` (see `App.tsx`).
- **Wrap new trees** in nothing extra — they're already under `<ThemeProvider>` from
  `App.tsx`. Use `useTheme()` for the active theme id when you need a root-bridge token.

## Switching themes

`<ThemeProvider>` (src/ThemeProvider.tsx) holds the active theme and feeds NativeWind's
`VariableContextProvider`. `useTheme()` gives `{ theme, setTheme, themes }`. The switcher
themes are curated in `src/veneer-themes.ts` (`DEMO_THEME_IDS`).

## Token data

`global.css` and `src/veneer-themes.generated.ts` are **generated** — do not edit. Run
`npm run gen:tokens` to regenerate from the installed `@offthegully/veneerui` (after
upgrading Veneer or to expose more builtin themes).

## React Native limits

Effect-heavy themes (glassmorphic / neumorphic / neon) degrade — RN has no CSS blur,
gradients, or layered shadows. The switcher shows the themes that port cleanly. Veneer's
web components are HTML-based and are NOT used here; build RN primitives
(`View` / `Text` / `Pressable`) that use the token classes above.
