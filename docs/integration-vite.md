# Add Veneer to a Vite + React app

Veneer is a drop-in add-on, not a scaffolder. Start from your own
**Vite + React + Tailwind v4** project (created however you like — `npm create
vite`, an existing app, a template) and add Veneer on top. Two paths: the CLI
does the wiring for you, or do the four steps by hand.

> Requires Tailwind **v4** (the CSS-first `@theme` engine). v3 is not supported.

## The fast path (CLI)

```sh
npm i @offthegully/veneerui
npx veneerui init            # patches your CSS + vite.config, prints the provider step
npx veneerui add switcher    # copies a ThemeSwitcher into src/components
npx veneerui add fonts       # prints the Fontsource install + imports for the built-in themes
```

> **Fonts:** a theme only *names* a font — your app loads it. `veneerui add fonts`
> prints the `@fontsource` install + `import` lines (drop them in `src/main.tsx`),
> and body text must use the `font-sans` token. See the [fonts guide](./fonts.md).

`veneerui init` is idempotent and supports `--dry-run`. It:

1. confirms `@offthegully/veneerui` and `tailwindcss` are present (it never installs for you),
2. adds `@import "@offthegully/veneerui/tokens.css";` to your global stylesheet,
3. adds the `veneer()` anti-flash plugin to `vite.config.ts`,
4. prints the `<ThemeProvider>` wrapper to add to `src/main.tsx` (it doesn't edit
   your entry file — wrapping the root is the one step you do by hand).

Then wrap your app root as printed, and you're done.

## The manual path (four steps)

### 1. Install

```sh
npm i @offthegully/veneerui
```

### 2. Import the tokens into your Tailwind stylesheet

In the CSS file where you import Tailwind (commonly `src/index.css`), add the
Veneer tokens right after it:

```css
@import "tailwindcss";
@import "@offthegully/veneerui/tokens.css";
```

This is the whole interlock. The `@theme` block in `tokens.css` makes Tailwind
generate the token utilities (`bg-primary`, `rounded-md`, …); Veneer's runtime
overrides the same CSS variables when you switch themes.

### 3. Wire the anti-flash script

So a returning user's saved theme applies *before* first paint (no flash of the
default), add the plugin to your Vite config:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { veneer } from '@offthegully/veneerui/vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), veneer()],
})
```

The plugin injects a tiny synchronous script into `index.html` — you never edit
HTML yourself.

### 4. Wrap your app in the provider

```tsx
// src/main.tsx
import { ThemeProvider } from '@offthegully/veneerui'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
```

### 5. (Optional) Drop the agent guide so AI tools follow the token rules

`veneerui init` also writes a Veneer section into your `AGENTS.md` / `CLAUDE.md` so
Cursor, Claude Code, Copilot, and the rest follow the same "drive everything
from tokens, never hardcode" contract when they generate components. The section
is delimited by `<!-- veneer:guide:start -->` … `<!-- veneer:guide:end -->`
markers and re-running `init` re-syncs it in place without touching anything you
wrote outside the markers. To do this by hand, copy the guide body from
`packages/cli/assets/agent-guide.md` into your project's `AGENTS.md`.

That's it. Add a switcher with `npx veneerui add switcher`, or build your own UI
against the [`useTheme()`](#api) hook.

## Using themes

Components style themselves with the semantic token utilities Tailwind generated
— `bg-surface`, `text-text`, `border-border`, `rounded-md`, `shadow-card`, and so
on. Never hardcode a color (`bg-blue-500`, `text-[#fff]`); that's an island a
theme can't reskin. (Veneer ships an ESLint rule and a conformance test that
enforce this — copy them in too if you want the guarantee in your own project.)

Your app ships a **default theme** as its brand; users import or author others.
See the [authoring guide](./authoring-guide.md) and [token reference](./schema-reference.md).

## Shipping your own themes

By default `<ThemeProvider>` ships Veneer's built-in themes. To ship *your own*
set instead, author them with `defineTheme` (it fills in the bookkeeping —
`schemaVersion`, `source`, `version`, author — so you write only the meaningful
part) and pass them to the provider:

```tsx
// src/themes.ts — keep this a module-level constant
import { defineTheme } from '@offthegully/veneerui'

export const themes = [
  defineTheme({ id: 'brand', name: 'Brand', tokens: { 'color-primary': '#5b21b6', /* ... */ } }),
  defineTheme({ id: 'brand-dark', name: 'Brand Dark', tokens: { /* ... */ } }),
]
```

```tsx
// src/main.tsx
import { ThemeProvider } from '@offthegully/veneerui'
import { themes } from './themes'

<ThemeProvider themes={themes} defaultThemeId="brand">
  <App />
</ThemeProvider>
```

Your themes are the **app-owned tier**: they can't be deleted from the library,
and on every load the live definitions replace the persisted copies (so shipping
a theme change reaches returning users). Themes a visitor imports or authors are
preserved alongside them.

To kill the flash on a visitor's *first-ever* load (before anything is saved),
pass that same default theme to the anti-flash plugin so its tokens paint
immediately:

```ts
// vite.config.ts
import { veneer } from '@offthegully/veneerui/vite'
import { themes } from './src/themes'

export default defineConfig({
  plugins: [react(), tailwindcss(), veneer({ defaultTheme: themes[0] })],
})
```

Keep the plugin's `defaultTheme` in sync with the provider's `defaultThemeId` —
the script runs before React, so it can't read the prop.

A theme can override as much or as little as you like: change only colors for a
quick re-skin, or also move radius, shadow, border width, type, and motion for a
full redesign. Structural tokens you don't set fall back to the schema defaults.

## Optional: shuffle themes until the visitor picks one

For a showcase, you can show a **random theme on every visit** until the visitor
pins one by selecting it. It stays flash-free: the anti-flash plugin inlines a pool
of themes and applies a random one before first paint.

```ts
// vite.config.ts
import { veneer } from '@offthegully/veneerui/vite'
import { themes } from './src/themes'

export default defineConfig({
  // pass the themes a first-time visitor may land on (id + tokens is enough)
  plugins: [react(), tailwindcss(), veneer({ shuffleUntilPinned: themes })],
})
```

```tsx
// give the in-page shuffle the same pool so both draw from the same themes
<ThemeProvider themes={themes} shuffleIds={themes.map((t) => t.id)}>
  <App />
</ThemeProvider>
```

Selecting a theme in the switcher **pins** it (`useTheme().pinned` becomes `true`)
and saves it, which stops the shuffling. `useTheme().shuffle()` re-rolls and returns
to the unpinned state — wire it to a "Shuffle" control. Omit `shuffleUntilPinned`
entirely for the ordinary behavior (apply the saved theme, no shuffling).

## API

`@offthegully/veneerui` exports the runtime: `ThemeProvider`, `useTheme()` (which returns
`current`, `enabledThemes`, `setCurrent`, the import/preview actions, and — for the
shuffle feature — `pinned` and `shuffle()`), `applyTheme`, `defineTheme`,
`validateTheme`, `parseAndValidate` / `fetchTheme` / `isFetchableUrl`, `tokenValue`,
`TOKEN_SCHEMA`, `BUILTIN_THEMES`, `getAntiFlashScript`, and the `Theme` /
`ThemeLibrary` types. Subpaths: `@offthegully/veneerui/tokens.css` (the `@theme` block),
`@offthegully/veneerui/vite` (this plugin), `@offthegully/veneerui/next` (the Next adapter),
`@offthegully/veneerui/node` (the `css-tree` value checker for CI).
