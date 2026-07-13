# Add Veneer to your app

Veneer drives your whole visual surface from theme tokens. Wiring it in rests on
**three framework-agnostic invariants** — true on any React 19 + Tailwind v4 app:

1. **Tokens** — `@import "@offthegully/veneerui/tokens.css";` after `@import "tailwindcss";`
2. **Provider** — wrap the app root in `<ThemeProvider>`
3. **Anti-flash** — a tiny script before first paint, so a saved theme applies with no flash

`npm create veneerui` (new app) and `veneerui init` (existing app) set these up for
you. This guide shows the one-command path, the invariants in detail, how they land
per framework, and the agent hand-off.

> **Requires React 19 and Tailwind v4** (the CSS-first `@theme` engine). Tailwind
> v3 and non-React frameworks aren't supported.

**Pick your path:**

- **[Create a new app](#new-app)** — one command scaffolds and wires everything. **Recommended.**
- **[Add to an existing app](#existing)** — works today; your styles won't re-skin
  until they move onto tokens. **Beta.**
- **[React Native / Expo](./expo.md)** — `npm create veneerui@latest my-app -- --framework expo`
  scaffolds a themed Expo app; same tokens and utilities on native via NativeWind.
  **Experimental.**
- **The invariants & per-framework wiring:** [interlock](#interlock) · [Vite](#vite) ·
  [Next.js](#nextjs) · [React Router 7](#react-router) · [other React + Tailwind v4](#other)

---

<a id="new-app"></a>
<a id="fresh"></a>

## Create a new app — recommended

One command scaffolds a React + Tailwind v4 app, wires all three invariants, and
drops in a theme switcher — so it runs themed from the first commit:

```sh
npm create veneerui@latest my-app
```

**Any package manager works** — the scaffolder installs and wires with whichever
one you invoke it through, so use the create command for yours (or force one with
the `--pm` flag below):

```sh
pnpm create veneerui my-app
yarn create veneerui my-app
bun create veneerui my-app
```

It asks one thing — **which framework** (Vite + React, Next.js App Router, React Router 7,
or [Expo / React Native](./expo.md) — experimental) — then delegates to that framework's
official scaffolder (`create-vite` / `create-next-app` / `create-react-router` /
`create-expo-app`), installs Veneer, wires the tokens `@import` + `<ThemeProvider>` +
anti-flash script (or, on Expo, the NativeWind config + token codegen + provider), enables
the `veneer/*` themeability lint gate (when the template ships no ESLint — create-vite v8
ships oxlint, React Router none — it adds a minimal flat config and chains `eslint` into
the `lint` script), copies in a `ThemeSwitcher`, and writes an `AGENTS.md` of the token
rules. Then:

```sh
cd my-app && npm run dev
```

Open it, switch themes in the top-right, and watch every surface re-skin. Build the
rest with the token utilities (`bg-surface`, `text-text`, `rounded-md`, …).

**Flags** (all optional — the command is also fully non-interactive for scripts/agents):

| Flag | Effect |
|---|---|
| `--framework <vite\|next\|react-router\|expo>` | skip the prompt (`react-router` = React Router 7, also accepts `remix`; `expo` = React Native, [experimental](./expo.md)) |
| `--agent[=claude\|codex]` | after wiring, hand off to an installed agent to finish/customize ([below](#agent)) |
| `--pm <npm\|pnpm\|yarn\|bun>` | override the detected package manager |
| `--no-install` · `--dry-run` | as named |

> **With npm, prefer the `--` separator** so npm forwards every flag straight to the
> scaffolder instead of consuming some itself:
> `npm create veneerui@latest my-app -- --framework next`. Without the `--`, npm
> treats `--framework` / `--pm` / `--dry-run` as unknown config (you'll see an
> `Unknown cli config` warning). The scaffolder recovers `--framework` from either
> form — so `npm create veneerui@latest my-app --framework next` and `--framework=next`
> both still give you a Next app — but the `--` is the reliable way to pass `--pm` /
> `--agent` / `--dry-run` too.

> **Scaffold warnings are mostly upstream.** `create-next-app` and `create-expo-app`
> print their own npm noise during install — a couple of "moderate severity" audit
> advisories on Next, and a wall of deprecation warnings plus more advisories on Expo.
> These come from *their* dependency trees, not Veneer; they're expected and safe to
> ignore — the app still builds and runs.

**Another framework?** (Astro, Gatsby, …) Scaffold it with that framework's own
tool, then run `npx veneerui init` inside it: Veneer's runtime is
framework-agnostic, so the [three invariants](#interlock) are all it needs. `init`
also **recognizes and auto-wires TanStack Start** (the same SSR-on-Vite shape as
[React Router](#react-router)); for anything it can't wire it writes a
`VENEER-SETUP.md` you (or [your agent](#agent)) can finish.

---

<a id="interlock"></a>

## The one interlock

Everything hangs on a single line of CSS. In the stylesheet where you import
Tailwind:

```css
@import "tailwindcss";
@import "@offthegully/veneerui/tokens.css";   /* must come after tailwindcss */
```

`tokens.css` is a Tailwind v4 `@theme` block: it makes Tailwind generate the
token utilities (`bg-primary`, `rounded-md`, `text-5xl`, …) and seed their
`:root` defaults. At runtime Veneer overrides the same CSS variables on `<html>`,
so switching a theme re-skins every utility instantly with no re-render.
`veneerui init` adds this line for you.

---

## Wire it up

`veneerui init` makes all the edits below when it recognizes your entry files
(always true on a freshly scaffolded app): the token `@import`, the anti-flash
plugin/script, **and** wrapping the root in `<ThemeProvider>`. Anything whose shape
it can't patch safely it leaves in a self-removing [`VENEER-SETUP.md`](#agent) for
you (or your agent) to finish. It **detects your framework** and **your package
manager** (from the lockfile), **never installs packages** (it prints the exact
`npm` / `pnpm` / `yarn` / `bun` command to run — pass `--pm` to override), and is
idempotent + `--dry-run`-able. Here's what lands per framework — also the recipe if
you're wiring by hand.

<a id="vite"></a>

### Vite + React

`init` adds the [token `@import`](#interlock), the `veneer()` anti-flash plugin,
**and** wraps your root in `<ThemeProvider>` — all three:

```ts
// vite.config.ts — added by init
import { veneer } from '@offthegully/veneerui/vite'

export default defineConfig({
  plugins: [veneer(), tailwindcss(), react()],
})
```

```tsx
// src/main.tsx — init wraps your root
import { ThemeProvider } from '@offthegully/veneerui'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
```

The `veneer()` plugin injects a tiny synchronous script into `index.html` so a
returning visitor's saved theme applies before first paint — no flash, and you
never hand-edit HTML.

<a id="nextjs"></a>

### Next.js (App Router)

> App Router + Tailwind v4 only. The Pages Router and v3 aren't supported.

`init` adds the token `@import`, creates `app/providers.tsx`, and wires
`app/layout.tsx` — the head script, `suppressHydrationWarning`, and the
`<Providers>` wrap, all shown below.

**Anti-flash** — `init` renders the server-component script in `<head>`:

```tsx
// app/layout.tsx
import { AntiFlashScript } from '@offthegully/veneerui/next'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <AntiFlashScript />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

`suppressHydrationWarning` on `<html>` is **required**: the script sets theme
variables on `<html>` before React hydrates, and this silences the resulting
(intended) one-element mismatch — nothing else. [Details →](#ssr)

**Provider** — it uses context + `localStorage`, so it's a client component.
Wrap it once and use that in the layout:

```tsx
// app/providers.tsx
'use client'
import { ThemeProvider } from '@offthegully/veneerui'

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

// then in app/layout.tsx:  <body><Providers>{children}</Providers></body>
```

`veneerui add` automatically prepends `'use client'` to copied components on a
Next project (they use hooks; the directive is inert elsewhere). There's one
Next-specific hydration footgun for components that render theme *identity* —
the bundled `ThemeSwitcher` already handles it; see the [SSR notes](#ssr) before
writing your own.

> **Fonts on an existing Next app — the one thing to undo.** (A fresh
> `create-veneerui` scaffold already does this for you.) `create-next-app` pins
> `next/font` (Geist) on the document and writes `body { font-family: … }` plus a
> `--font-sans: var(--font-geist-sans)` mapping into `app/globals.css`. Those
> override Veneer's `font-sans` token, so **body text won't follow a theme's font**
> — a serif or mono theme re-skins only the headings that opt into `font-display`,
> and the body stays Geist. To let type theme fully, drop the `next/font` class from
> `<body>` and remove the `body { font-family }` rule and the `--font-sans` /
> `--font-mono` lines from `app/globals.css`. (Color, radius, border, and shadow
> theming are unaffected.) See [Fonts](#fonts).

<a id="react-router"></a>

### React Router 7 (Remix's successor)

> Framework mode (SSR) + Tailwind v4. The default `create-react-router` template
> already ships both, so the interlock is a single line.

React Router 7 is **fully wired** — `npm create veneerui@latest my-app -- --framework react-router`
scaffolds a fresh one, and `npx veneerui init` wires an existing RR7 app. It's the first
of the **SSR-on-Vite** frameworks, and it surfaces the one thing that differs from a Vite
SPA — the part the old "Vite vs Next" split got wrong:

- **Tailwind** comes from `@tailwindcss/vite` (the SPA way) — `init` adds the token
  `@import` to `app/app.css`.
- **Anti-flash does _not_ use the `veneer()` Vite plugin.** RR7 renders its document from
  `app/root.tsx`, with no `index.html` for the plugin's `transformIndexHtml` to touch — so
  the script goes in that `<head>` instead, exactly like Next:

```tsx
// app/root.tsx — init wires the Layout
import { ThemeProvider, getAntiFlashScript } from '@offthegully/veneerui'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getAntiFlashScript() }} />
        {/* …existing <Meta/>, <Links/> */}
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        {/* …<ScrollRestoration/>, <Scripts/> */}
      </body>
    </html>
  )
}
```

No `'use client'` and no providers file: React Router has no RSC boundary, so the context
provider is used directly. `suppressHydrationWarning` on `<html>` is required for the same
reason as Next — the script mutates `<html>` before hydration. (React 19 may hoist the
inline `<script>` below sibling `<meta>`/`<title>`, but it still lands before the
render-blocking stylesheet, so it runs before first paint — no flash.) On a fresh scaffold,
Veneer also clears the template's pinned `--font-sans` and `bg-white dark:bg-gray-950`
surface so type and color theme fully.

**TanStack Start** is the same SSR-on-Vite shape (a `src/routes/__root.tsx` document), so
`npx veneerui init` recognizes and auto-wires it identically — no extra steps.

<a id="other"></a>

### Other React frameworks

Veneer's runtime is framework-agnostic — it's React 19 + Tailwind v4 + a provider
+ one inline script. Vite, Next, [React Router 7, and TanStack Start](#react-router) are
auto-wired; **any other** React 19 + Tailwind v4 app works too via the three steps below.
Run `veneerui init` anyway: on an unrecognized project it writes the agent guide and a
**generic [`VENEER-SETUP.md`](#agent)** so you can finish by hand or hand it to your agent.
The steps:

1. **Interlock** — add the [token `@import`](#interlock) to your Tailwind stylesheet.
2. **Provider** — wrap your app root in `<ThemeProvider>` (inside a client
   boundary if your framework has a server/client split).
3. **Anti-flash** — inline the script into your document `<head>`, before any
   stylesheet:

```tsx
import { getAntiFlashScript } from '@offthegully/veneerui'

// render in your document head — e.g. Remix root.tsx, Astro layout:
<script dangerouslySetInnerHTML={{ __html: getAntiFlashScript() }} />
```

`getAntiFlashScript(defaultTokens?)` returns dependency-free JS that applies the
saved theme before paint. Pass your default theme's `tokens` map to also kill the
first-load flash (see [Ship your own themes](#themes)).

**Known to work, not yet auto-wired** — no CLI auto-wiring yet, so expect to run the
three steps by hand (or via your agent) and please [report what you hit](https://github.com/offthegully/veneerui/issues):

- **Astro** (React islands) — see the per-island note below
- **Gatsby** (`wrapRootElement` + `gatsby-ssr.onPreRenderHTML` for the head script)
- **RedwoodJS**
- any custom **Webpack / Rsbuild / Parcel** React setup

The only hard requirement is **React 19 + Tailwind v4** — if a framework has those,
the three steps above are all it needs. **For SSR frameworks the anti-flash script goes
in your document `<head>`, not the Vite plugin** (the plugin only injects into a real
`index.html`, which SSR frameworks don't have). One caveat: if your framework forbids
importing the React-context package root from a server file (Next's RSC does), import
`getAntiFlashScript` only where it's allowed — or use the dedicated [`/next`](#nextjs)
adapter.

#### Astro (React islands) — a different shape, by design

Astro pages aren't a React tree, so there's no single root to wrap in `<ThemeProvider>`
— and you don't need one. Theming is **global**: the tokens are CSS variables on `<html>`,
and the anti-flash script + `applyTheme` mutate them for the whole document, React or not.
So the provider scopes to *interactive islands*, not the page:

- **Tailwind + tokens** — Astro runs on Vite; add `@tailwindcss/vite` and the token
  `@import` to your global stylesheet exactly as elsewhere.
- **Anti-flash** — inline the script in your base layout's `<head>` (`.astro`). `is:inline`
  keeps it un-bundled so it runs before paint:

```astro
---
import { getAntiFlashScript } from '@offthegully/veneerui'
const antiFlash = getAntiFlashScript()
---
<html lang="en">
  <head><script is:inline set:html={antiFlash} /></head>
  <body><slot /></body>
</html>
```

- **Provider — per interactive island, not the page.** An island that only uses token
  utilities (`bg-surface`, `text-text`) re-skins automatically — no provider. Only an
  island that calls `useTheme` (e.g. a theme switcher) needs `<ThemeProvider>`, and it
  wraps *itself*:

```tsx
// ThemeSwitcherIsland.tsx — hydrated with client:load
import { ThemeProvider } from '@offthegully/veneerui'
import { Switcher } from './Switcher'
export default function ThemeSwitcherIsland() {
  return <ThemeProvider><Switcher /></ThemeProvider>
}
```

Multiple such islands stay in sync — each provider reads the same `localStorage` and writes
the same `<html>` variables. This island-scoped provider is the one structural difference
from every other target; tokens, anti-flash, and the `veneer/*` themeability lint rules are identical.

---

<a id="existing"></a>

## Add to an existing app (Beta)

`veneerui init` wires the [three invariants](#interlock) into an existing React 19 +
Tailwind v4 app and adds the [`eslint-plugin-veneer`](../packages/eslint-plugin) gate
— it patches the common create-vite / create-next shapes in place, and anything it
can't patch safely lands in a [`VENEER-SETUP.md`](#agent). Since `init` only instructs
(it never installs), it reads your lockfile and prints every dependency command in
your package manager's dialect — `pnpm add …`, `yarn add …`, `bun add …` — with `--pm`
to override. But wiring is the easy 10%:
the real work is **moving your current styles onto tokens**. Veneer only re-skins
elements that already use token utilities (`bg-surface`, `text-text`,
`border-border`), so hardcoded colors, baked shadows (`shadow-md` →
`[box-shadow:var(--shadow-md)]`), and fixed sizes must each move onto the token form —
a judgment call for color, mechanical for the gotchas. The token vocabulary and the
full "looks themeable but bakes at build time" table live in
**[AGENTS.md](../AGENTS.md)**, which `init` drops into your repo so your coding agent
can drive the migration. This path works today but is rougher than a fresh start.

---

<a id="themes"></a>

## Ship your own themes

By default `<ThemeProvider>` ships Veneer's built-ins. To ship *your* set, author
them with `defineTheme` (it fills in the bookkeeping — `schemaVersion`, `source`,
`version`, author — so you write only the meaningful part) and pass them in.
**Import `defineTheme` from the `/themes` subpath** — it's a side-effect-free
data slice, safe to import from server code; the package root pulls in React
context and throws in a Server Component.

```tsx
// src/themes.ts (or app/themes.ts) — keep it a module-level constant
import { defineTheme } from '@offthegully/veneerui/themes'

export const themes = [
  defineTheme({ id: 'brand', name: 'Brand', tokens: { 'color-primary': '#5b21b6', /* … */ } }),
  defineTheme({ id: 'brand-dark', name: 'Brand Dark', tokens: { /* … */ } }),
]
```

```tsx
<ThemeProvider themes={themes} defaultThemeId="brand">{children}</ThemeProvider>
```

Your themes are the **app-owned tier**: non-deletable, and re-seeded from the
live definitions on every load (so shipping a theme change reaches returning
users). Each theme
can change as much or as little as you like — only colors for a quick re-skin, or
also radius, shadow, border width, type, and motion for a full redesign; anything
you omit falls back to the schema default.

**Need a color the schema palette doesn't have** — gold, a brand secondary, a chart
series? Don't hardcode it: declare a `color-x-*` token in your **base theme** (its
fallback source) and consume it via `var()`. Full rules in the
[authoring guide](./authoring-guide.md#4-custom-colors-beyond-the-schema-palette).

To also kill the flash on a visitor's *first-ever* load (before anything is
saved), pass the same default theme to the anti-flash wiring. It runs before
React and can't read the provider prop, so keep the two in sync:

```ts
veneer({ defaultTheme: themes[0] })            // Vite:  vite.config.ts plugin
<AntiFlashScript defaultTheme={themes[0]} />   // Next:  app/layout.tsx <head>
```

---

## Fonts

A theme can only **name** a font; your app must load it, and the family string
must match exactly. Run `npx veneerui add fonts` for the
[Fontsource](https://fontsource.org) install command and import lines for the
built-in themes' families. The one footgun: **drive body text from the
`font-sans` token** — don't pin a framework font (e.g. Next's `next/font` on
`<body>`), which overrides the token and silently disables all font theming. Full
family ↔ package mapping: **[fonts.md](./fonts.md)**.

---

<a id="agent"></a>

## Let your AI agent take it from here

**Finishing setup.** `init` leaves a `VENEER-SETUP.md` with the few project-shaped
steps it won't patch blindly. It's plain markdown — both a manual checklist and
agent instructions — so in any tool you can just say *"Finish the Veneer setup in
VENEER-SETUP.md, then verify it and delete the file."* The agent wraps your root in
`<ThemeProvider>`, adds the Next `<head>` script if needed, verifies, and removes
the file. (It's self-removing precisely so it doesn't linger once setup is done.)

**Building from there.** `veneerui init` also writes a Veneer section into your
**`AGENTS.md` / `CLAUDE.md`** (the files Cursor, Claude Code, Copilot, … read),
delimited by `<!-- veneer:guide:start -->` markers and re-synced in place on every
`init`. Unlike the one-time setup file, this stays: it teaches any coding agent the
one rule — **drive everything from tokens; never hardcode a color or visual
value** — plus the token vocabulary and the handful of "looks right but breaks
theming" gotchas.

So once Veneer is wired in, you keep building UI by *prompting*: the agent knows
Veneer is under the hood, reaches for `bg-surface` / `text-text` / `rounded-md`
instead of raw hexes, and stays inside the token system — which is exactly what
keeps the whole app re-skinnable. (To add the guide by hand, copy
`packages/cli/assets/agent-guide.md` into your `AGENTS.md`.)

---

<a id="api"></a>

## API

`@offthegully/veneerui` exports the runtime: `ThemeProvider`, `useTheme()` (returns
`current`, `enabledThemes`, `setCurrent`, `setEnabled`, and `hydrated`),
`applyTheme`, `defineTheme`, `validateTheme`,
`tokenValue`, `getAntiFlashScript`, `TOKEN_SCHEMA`, `BUILTIN_THEMES`, and the
`Theme` / `ThemeLibrary` types.

| Subpath | What it exports |
|---|---|
| `@offthegully/veneerui` | the runtime (above) |
| `@offthegully/veneerui/themes` | server-safe data slice — `defineTheme`, `BUILTIN_THEMES`, `TOKEN_SCHEMA`, types (no React context) |
| `@offthegully/veneerui/tokens.css` | the generated `@theme` token block |
| `@offthegully/veneerui/vite` | `veneer()` — the Vite anti-flash plugin |
| `@offthegully/veneerui/next` | `<AntiFlashScript />` — the Next anti-flash component |
| `@offthegully/veneerui/node` | the `css-tree` value checker for CI |

Authoring a theme: the **[authoring guide](./authoring-guide.md)** and the
generated **[token reference](./schema-reference.md)**.

---

<a id="advanced"></a>

## Advanced

<details>
<summary><b>How anti-flash works (and the cold-start flash)</b></summary>

On the server (or before the bundle loads) there's no `localStorage`, so the page
would paint the CSS `:root` schema defaults first, then snap to the saved theme
once React runs — a flash. The anti-flash script prevents it: a tiny,
dependency-free `<script>` that runs **before first paint**, reads the saved
library from `localStorage`, and writes that theme's CSS variables straight to
`<html>`. Because it writes to the **DOM, not React's tree**, the client
`ThemeProvider` reconciles to the same values on mount with no work and no
warning. Returning visitors see their theme immediately.

The Vite plugin and the Next `<AntiFlashScript />` both emit this same script;
the generic [`getAntiFlashScript()`](#other) is the string itself.

**Cold start (first-ever visit).** With nothing saved yet, the script has no
theme to apply, so a first-time visitor still sees the `:root` default until
React mounts. If you ship a non-default brand theme, pass it to the anti-flash
wiring so its tokens paint immediately — and keep it in sync with the provider's
`defaultThemeId`, since the script runs before React and can't read props:

```ts
veneer({ defaultTheme: themes[0] })            // Vite
<AntiFlashScript defaultTheme={themes[0]} />   // Next
getAntiFlashScript(themes[0].tokens)           // generic
```

This whole mechanism covers **CSS-variable styling** — the `bg-surface`,
`text-text`, `border-border` utilities. Style your UI entirely from those and you
never think about flash or hydration. The one exception is the SSR note below.

</details>

<a id="ssr"></a>

<details>
<summary><b>SSR &amp; hydration (Next.js and other SSR frameworks)</b></summary>

The anti-flash script writes theme variables to `<html>` *before* React hydrates,
so the server-rendered `<html>` and the hydrated one differ on that element.
`suppressHydrationWarning` on `<html>` silences exactly that intended mutation —
it's one level deep (it does **not** suppress warnings for `<body>` or anything
inside) and is required on Next.

**The one case the script can't cover** is a component that renders the *identity*
of the current theme into React's tree — its `name`, or swatches built from its
specific colors. Those values are client-only (they come from `localStorage`), so
the server renders the default while the first client render already holds the
real theme — a mismatch.

Guard any such component with **`useTheme().hydrated`**: render a stable,
theme-neutral output while it's `false`, then reveal the real value once it flips
to `true` after mount. Drive the placeholder from CSS-variable utilities
(`bg-primary`, `bg-surface`), never from a theme's inline color values, so the
markup is identical on the server and the first client render.

```tsx
'use client'
import { useTheme } from '@offthegully/veneerui'

function CurrentThemeName() {
  const { current, hydrated } = useTheme()
  return <span>{hydrated ? current.name : 'Theme'}</span>
}
```

The bundled `ThemeSwitcher` (`npx veneerui add switcher`) already does this for
its trigger, so it's SSR-safe out of the box.

> **Don't inline tokens onto `<html>` (or anywhere) in JSX.** Spreading a theme's
> tokens into a `style={{ '--color-primary': … }}` prop on the server
> re-introduces the mismatch (a server roll vs. a client roll). Let the
> anti-flash script own the `<html>` variables; never render token values through
> React.

</details>
