# @offthegully/veneerui

User-extensible **Tailwind CSS v4** theming runtime. The visual surface of your
app — color, type, spacing, borders, radii, shadows, blur, motion — is driven by a
fixed set of design **tokens**. A *theme* is a small JSON file overriding some of
those tokens; switching is one DOM write (no re-render), and themes are **inert
data, not code**, so they're safe to load from untrusted sources.

This is the runtime + tokens. The matching `veneerui` CLI copies UI components
(switcher, import panel) into your project — Tailwind v4 doesn't scan
`node_modules`, so components live in *your* source where Tailwind can see them.

## Install

```sh
npm i @offthegully/veneerui
npx veneerui init          # wires the @import, anti-flash, and prints the provider step
npx veneerui add switcher  # copies a ThemeSwitcher into your components
```

> Requires React 19 and Tailwind **v4** (the CSS-first `@theme` engine).

## Manual setup (what `veneerui init` does)

```css
/* your global stylesheet */
@import "tailwindcss";
@import "@offthegully/veneerui/tokens.css";   /* generates bg-primary, rounded-md, … */
```

```tsx
import { ThemeProvider } from '@offthegully/veneerui'
// wrap your app root in <ThemeProvider>…</ThemeProvider>
```

Anti-flash (apply the saved theme before first paint):

- **Vite:** add `veneer()` from `@offthegully/veneerui/vite` to your plugins.
- **Next (App Router):** render `<AntiFlashScript />` from `@offthegully/veneerui/next` in
  `app/layout.tsx`'s `<head>`.

Full step-by-step (CLI and manual) for each framework:
- [Vite guide](https://github.com/your-org/veneer/blob/main/docs/integration-vite.md)
- [Next.js guide](https://github.com/your-org/veneer/blob/main/docs/integration-next.md)

## Entry points

| Import | What |
|---|---|
| `@offthegully/veneerui` | `ThemeProvider`, `useTheme`, `applyTheme`, `defineTheme`, `validateTheme`, `parseAndValidate` / `fetchTheme` / `isFetchableUrl`, `tokenValue`, `browserCheckValue`, `getAntiFlashScript`, `TOKEN_SCHEMA`, `BUILTIN_THEMES`, `SCHEMA_VERSION`, and the `Theme` / `ThemeLibrary` / `TokenDef` types |
| `@offthegully/veneerui/tokens.css` | the generated `@theme` / `:root` token block |
| `@offthegully/veneerui/vite` | `veneer()` — the Vite anti-flash plugin |
| `@offthegully/veneerui/next` | `<AntiFlashScript />` — the Next anti-flash component |
| `@offthegully/veneerui/node` | `nodeCheckValue` — the `css-tree` value checker for CI (kept out of the browser bundle) |

## How themeing works

Tokens are declared in Tailwind's `@theme` block, which emits both a CSS custom
property *and* a utility class (`--color-primary` → `bg-primary`). Components use
only those semantic utilities. `applyTheme()` (and the `ThemeProvider`) set the
tokens as inline custom properties on `<html>`, which outrank the `:root`
defaults — so switching a theme just changes variables, and every utility updates
instantly with no re-render.

A theme is rejected — never silently degraded — if it fails validation: it must
match the published JSON Schema, use only known tokens and valid CSS values, name
only bundled fonts (no `url()`), and contain no dangerous patterns (`url()`,
`@import`, `javascript:`, `expression()`, `; { } < >`). Because a theme can only
set declared CSS variables already consumed by compiled utilities, there's no path
from a theme to new CSS, modified HTML, or executed code.

## Optional: shuffle until pinned

For a showcase, pass `veneer({ shuffleUntilPinned: themes })` (Vite) and
`<ThemeProvider shuffleIds={...}>` to show a random theme on every visit — applied
before first paint, so still flash-free — until the visitor selects one, which pins
it. `useTheme()` exposes `pinned` and `shuffle()` to build the control. Omit it for
the ordinary "apply the saved theme" behavior. See the
[Vite guide](https://github.com/your-org/veneer/blob/main/docs/integration-vite.md).

## License

MIT
