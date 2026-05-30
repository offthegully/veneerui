# Add Veneer to a Next.js (App Router) app

Veneer is a drop-in add-on. Start from your own **Next.js App Router +
Tailwind v4** project and add Veneer on top. The CLI handles the deterministic
edits; the provider wrapper and the `<head>` script you place by hand (Next entry
files are too project-shaped to patch blindly).

> Requires the **App Router** and Tailwind **v4**. The Pages Router and Tailwind
> v3 are not supported.

## The fast path (CLI)

```sh
npm i @offthegully/veneerui
npx veneerui init            # adds the token @import, prints the head + provider steps
npx veneerui add switcher    # copies a ThemeSwitcher into src/components
```

`veneerui init` detects Next, adds `@import "@offthegully/veneerui/tokens.css";` to your
global stylesheet, and prints the two snippets below for you to paste.

## The manual path

### 1. Install

```sh
npm i @offthegully/veneerui
```

### 2. Import the tokens into your Tailwind stylesheet

In `app/globals.css` (or wherever you import Tailwind):

```css
@import "tailwindcss";
@import "@offthegully/veneerui/tokens.css";
```

This makes Tailwind generate the token utilities; Veneer's runtime overrides the
same CSS variables at runtime.

### 3. Anti-flash: render the script in `<head>`

`<AntiFlashScript />` is a **server** component that emits a synchronous script
applying the saved theme before first paint:

```tsx
// app/layout.tsx
import { AntiFlashScript } from '@offthegully/veneerui/next'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <AntiFlashScript />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### 4. Wrap the app in the provider (client boundary)

`ThemeProvider` uses context, `localStorage`, and `useLayoutEffect`, so it's a
client component. Wrap it in your own `"use client"` file and use that in the
layout:

```tsx
// app/providers.tsx
'use client'
import { ThemeProvider } from '@offthegully/veneerui'

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}
```

```tsx
// app/layout.tsx (body)
import { Providers } from './providers'
// ...
<body><Providers>{children}</Providers></body>
```

### 5. (Optional) Drop the agent guide so AI tools follow the token rules

`veneerui init` also writes a Veneer section into your `AGENTS.md` / `CLAUDE.md` so
Cursor, Claude Code, Copilot, and the rest follow the same "drive everything
from tokens, never hardcode" contract when they generate components. The section
is delimited by `<!-- veneer:guide:start -->` … `<!-- veneer:guide:end -->`
markers and re-running `init` re-syncs it in place without touching anything you
wrote outside the markers. To do this by hand, copy the guide body from
`packages/cli/assets/agent-guide.md` into your project's `AGENTS.md`.

## Why there's no flash and no hydration mismatch

On the server there is no `localStorage`, so Next renders with the schema
defaults. The `<AntiFlashScript>` in `<head>` then writes the saved theme's CSS
variables to the DOM **before paint and before hydration**. Because it writes to
the DOM — not to React's tree — the client `ThemeProvider` reconciles to the same
values on hydration with no mismatch warning. Returning users see their theme
immediately.

This covers **CSS-variable styling** — the `bg-surface`, `text-text`, `border-border`
utilities and friends. Style your UI entirely from those tokens and you never
think about hydration.

### Rendering theme *identity* into markup

There is one case the script can't cover: a component that renders the **identity**
of the current theme into React's tree — its `name`, swatches built from its
specific colors, or a branch keyed on `useTheme().pinned`. Those values are
client-only (they come from `localStorage` and, for shuffle, a per-load random
pick), so the server renders the default while the first client render already
holds the real theme — a mismatch.

Guard any such component with `useTheme().hydrated`: render a stable,
theme-neutral output while it's `false`, then reveal the real value once it flips
to `true` after mount. (Drive the placeholder's colors from the CSS-variable
utilities — `bg-primary`, `bg-surface` — not from a theme's inline color values,
so the markup is identical on the server and the first client render.)

```tsx
'use client'
import { useTheme } from '@offthegully/veneerui'

function CurrentThemeName() {
  const { current, hydrated } = useTheme()
  return <span>{hydrated ? current.name : 'Theme'}</span>
}
```

The bundled `ThemeSwitcher` (`npx veneerui add switcher`) already does this for
its trigger, so it's SSR-safe out of the box; follow the same pattern in your own
theme-aware components.

> **Don't inline tokens onto `<html>` (or anywhere) in JSX.** Applying a theme by
> spreading its tokens into a `style={{ '--color-primary': … }}` prop on the
> server re-introduces exactly this mismatch (a server roll vs. a client roll).
> Let `<AntiFlashScript>` own the `<html>` variables; never render token values
> through React.

## Shipping your own themes

By default `<ThemeProvider>` ships Veneer's built-in themes. To ship *your own*
set, author them with `defineTheme` (it fills in `schemaVersion`, `source`,
`version`, and author) in a module-level constant and pass them to the provider:

```tsx
// app/themes.ts
import { defineTheme } from '@offthegully/veneerui'

export const themes = [
  defineTheme({ id: 'brand', name: 'Brand', tokens: { 'color-primary': '#5b21b6', /* ... */ } }),
  defineTheme({ id: 'brand-dark', name: 'Brand Dark', tokens: { /* ... */ } }),
]
```

```tsx
// app/providers.tsx
'use client'
import { ThemeProvider } from '@offthegully/veneerui'
import { themes } from './themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider themes={themes} defaultThemeId="brand">
      {children}
    </ThemeProvider>
  )
}
```

Your themes are the **app-owned tier** — non-deletable and re-seeded from the
live definitions on every load — while themes a visitor imports or authors are
preserved alongside them.

To kill the flash on a visitor's *first-ever* load, pass the same default theme
to `<AntiFlashScript>` so its tokens paint before hydration:

```tsx
// app/layout.tsx
import { AntiFlashScript } from '@offthegully/veneerui/next'
import { themes } from './themes'

<head><AntiFlashScript defaultTheme={themes[0]} /></head>
```

Keep `AntiFlashScript`'s `defaultTheme` in sync with the provider's
`defaultThemeId` — the script runs before React, so it can't read the prop.

A theme can override as much or as little as you like — change only colors for a
quick re-skin, or also move radius, shadow, type, and motion for a full
redesign. Tokens you don't set fall back to the schema defaults.

## Optional: shuffle themes until the visitor picks one

To show a **random theme on every visit** until the visitor pins one (by selecting
it), pass the pool to both the `<AntiFlashScript>` (so the random pick applies
before paint, flash-free) and the provider's `shuffleIds`:

```tsx
// app/layout.tsx (head)
import { AntiFlashScript } from '@offthegully/veneerui/next'
import { themes } from './themes'

<head><AntiFlashScript shuffleUntilPinned={themes} /></head>
```

```tsx
// app/providers.tsx
<ThemeProvider themes={themes} shuffleIds={themes.map((t) => t.id)}>
  {children}
</ThemeProvider>
```

Selecting a theme pins it (`useTheme().pinned` → `true`) and saves it, stopping the
shuffle; `useTheme().shuffle()` re-rolls and returns to the unpinned state. Omit
`shuffleUntilPinned` for the ordinary "apply the saved theme" behavior.

## Using themes & API

Same as Vite: style with semantic token utilities (`bg-surface`, `text-text`, …),
ship a default theme as your brand, let users import/author others. The package
API is documented in the [Vite guide](./integration-vite.md#api); only the
anti-flash adapter differs (`@offthegully/veneerui/next` here vs `@offthegully/veneerui/vite`
there). See the [authoring guide](./authoring-guide.md) and
[token reference](./schema-reference.md).
