# Add Veneer to a Next.js (App Router) app

Veneer is a drop-in add-on. Start from your own **Next.js App Router +
Tailwind v4** project and add Veneer on top. The CLI handles the deterministic
edits; the provider wrapper and the `<head>` script you place by hand (Next entry
files are too project-shaped to patch blindly).

> Requires the **App Router** and Tailwind **v4**. The Pages Router and Tailwind
> v3 are not supported.

## The fast path (CLI)

```sh
npm i @veneer/theme
npx veneer init            # adds the token @import, prints the head + provider steps
npx veneer add switcher    # copies a ThemeSwitcher into src/components
```

`veneer init` detects Next, adds `@import "@veneer/theme/tokens.css";` to your
global stylesheet, and prints the two snippets below for you to paste.

## The manual path

### 1. Install

```sh
npm i @veneer/theme
```

### 2. Import the tokens into your Tailwind stylesheet

In `app/globals.css` (or wherever you import Tailwind):

```css
@import "tailwindcss";
@import "@veneer/theme/tokens.css";
```

This makes Tailwind generate the token utilities; Veneer's runtime overrides the
same CSS variables at runtime.

### 3. Anti-flash: render the script in `<head>`

`<AntiFlashScript />` is a **server** component that emits a synchronous script
applying the saved theme before first paint:

```tsx
// app/layout.tsx
import { AntiFlashScript } from '@veneer/theme/next'

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
import { ThemeProvider } from '@veneer/theme'

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

## Why there's no flash and no hydration mismatch

On the server there is no `localStorage`, so Next renders with the schema
defaults. The `<AntiFlashScript>` in `<head>` then writes the saved theme's CSS
variables to the DOM **before paint and before hydration**. Because it writes to
the DOM — not to React's tree — the client `ThemeProvider` reconciles to the same
values on hydration with no mismatch warning. Returning users see their theme
immediately.

## Shipping your own themes

By default `<ThemeProvider>` ships Veneer's built-in themes. To ship *your own*
set, author them with `defineTheme` (it fills in `schemaVersion`, `source`,
`version`, and author) in a module-level constant and pass them to the provider:

```tsx
// app/themes.ts
import { defineTheme } from '@veneer/theme'

export const themes = [
  defineTheme({ id: 'brand', name: 'Brand', tokens: { 'color-primary': '#5b21b6', /* ... */ } }),
  defineTheme({ id: 'brand-dark', name: 'Brand Dark', tokens: { /* ... */ } }),
]
```

```tsx
// app/providers.tsx
'use client'
import { ThemeProvider } from '@veneer/theme'
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
import { AntiFlashScript } from '@veneer/theme/next'
import { themes } from './themes'

<head><AntiFlashScript defaultTheme={themes[0]} /></head>
```

Keep `AntiFlashScript`'s `defaultTheme` in sync with the provider's
`defaultThemeId` — the script runs before React, so it can't read the prop.

A theme can override as much or as little as you like — change only colors for a
quick re-skin, or also move radius, shadow, type, and motion for a full
redesign. Tokens you don't set fall back to the schema defaults.

## Using themes & API

Same as Vite: style with semantic token utilities (`bg-surface`, `text-text`, …),
ship a default theme as your brand, let users import/author others. The package
API is documented in the [Vite guide](./integration-vite.md#api); only the
anti-flash adapter differs (`@veneer/theme/next` here vs `@veneer/theme/vite`
there). See the [authoring guide](./authoring-guide.md) and
[token reference](./schema-reference.md).
