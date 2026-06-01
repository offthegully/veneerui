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
- **[React Native / Expo](./expo.md)** — `npm create veneerui my-app --framework expo`
  scaffolds a themed Expo app; same tokens and utilities on native via NativeWind.
  **Experimental.**
- **The invariants & per-framework wiring:** [interlock](#interlock) · [Vite](#vite) ·
  [Next.js](#nextjs) · [other React + Tailwind v4](#other)

---

<a id="new-app"></a>
<a id="fresh"></a>

## Create a new app — recommended

One command scaffolds a React + Tailwind v4 app, wires all three invariants, and
drops in a theme switcher — so it runs themed from the first commit:

```sh
npm create veneerui@latest my-app
```

It asks one thing — **which framework** (Vite + React, Next.js App Router, or
[Expo / React Native](./expo.md) — experimental) — then delegates to that framework's
official scaffolder (`create-vite` / `create-next-app` / `create-expo-app`), installs
Veneer, wires the tokens `@import` + `<ThemeProvider>` + anti-flash script (or, on Expo,
the NativeWind config + token codegen + provider), copies in a `ThemeSwitcher`, and writes
an `AGENTS.md` of the token rules. Then:

```sh
cd my-app && npm run dev
```

Open it, switch themes in the top-right, and watch every surface re-skin. Build the
rest with the token utilities (`bg-surface`, `text-text`, `rounded-md`, …).

**Flags** (all optional — the command is also fully non-interactive for scripts/agents):

| Flag | Effect |
|---|---|
| `--framework <vite\|next\|expo>` | skip the prompt (`expo` = React Native, [experimental](./expo.md)) |
| `--agent[=claude\|codex]` | after wiring, hand off to an installed agent to finish/customize ([below](#agent)) |
| `--pm <npm\|pnpm\|yarn\|bun>` | override the detected package manager |
| `--no-install` · `--dry-run` | as named |

**Another framework?** (Remix, Astro, TanStack Start, …) Scaffold it with that
framework's own tool, then run `npx veneerui init` inside it: Veneer's runtime is
framework-agnostic, so the [three invariants](#interlock) are all it needs, and
`init` writes a `VENEER-SETUP.md` you (or [your agent](#agent)) can finish.

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
you (or your agent) to finish. It **detects your framework**, **never installs
packages** (it tells you to), and is idempotent + `--dry-run`-able. Here's what
lands per framework — also the recipe if you're wiring by hand.

<a id="vite"></a>

### Vite + React

`init` adds the [token `@import`](#interlock), the `veneer()` anti-flash plugin,
**and** wraps your root in `<ThemeProvider>` — all three:

```ts
// vite.config.ts — added by init
import { veneer } from '@offthegully/veneerui/vite'

export default defineConfig({
  plugins: [react(), tailwindcss(), veneer()],
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

<a id="other"></a>

### Other React frameworks (experimental)

Veneer's runtime is framework-agnostic — it's React 19 + Tailwind v4 + a provider
+ one inline script. Only the CLI's *auto-wiring* is Vite/Next-specific. Run
`veneerui init` anyway: on an unrecognized React + Tailwind project it writes the
agent guide and a **generic [`VENEER-SETUP.md`](#agent)** with the three steps
below — so you can still finish by hand, or hand it to your agent. The steps:

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

`getAntiFlashScript(defaultTokens?, shufflePool?)` returns dependency-free JS
that applies the saved theme before paint. Pass your default theme's `tokens` map
to also kill the first-load flash (see [Ship your own themes](#themes)).

**Known to work, not yet first-class** — no CLI auto-wiring and not fully tested
yet, so expect rough edges and please [report what you hit](https://github.com/offthegully/veneerui/issues):

- **Remix / React Router** (v7)
- **TanStack Start**
- **Astro** (React islands)
- **Gatsby**
- **RedwoodJS**
- any custom **Webpack / Rsbuild / Parcel** React setup

The only hard requirement is **React 19 + Tailwind v4** — if a framework has those,
the three steps above are all it needs. One caveat: if your framework forbids
importing the React-context package root from a server file (Next's RSC does),
import `getAntiFlashScript` only where it's allowed — or use the dedicated
[`/next`](#nextjs) adapter.

---

<a id="existing"></a>

## Add to an existing app (Beta)

Wiring Veneer in is the easy 10%. The real work is **moving your current styles
onto tokens**: Veneer only re-skins elements that already use token utilities
(`bg-surface`, `text-text`, `border-border`), so a freshly-wired existing app
mostly won't change until its hardcoded colors, baked shadows, and fixed sizes
are migrated. This path works today but is rougher than a fresh start — we're
actively smoothing it. Three tools make it a measured task, not a surprise:

```sh
npx veneerui doctor    # how much of your UI is themeable today, by blocker
npx veneerui migrate   # rewrite the mechanical gotchas to tokens  (--dry-run to preview)
```

- **`doctor`** scans the project and reports the share of files free of un-themed
  *islands* — hardcoded colors, baked `shadow-*`, fixed `border` widths,
  arbitrary sizes — broken down by what's blocking each. It also flags the #1
  adoption trap: a **shadcn** (or other) `@theme` block redefining a token name
  Veneer owns, which silently shadows it so `bg-primary` only half-works.
- **`migrate`** rewrites the deterministic 1:1 gotchas inside `className`s —
  `shadow-md` → `[box-shadow:var(--shadow-md)]`, `border` →
  `[border-width:var(--border-width-default)]`, `duration-200` → the calc form —
  and **flags** (never guesses) the judgment calls: which palette maps to
  `bg-primary` vs `bg-accent`, whether a surface is raised or sunken.
- **[`eslint-plugin-veneer`](../packages/eslint-plugin)** keeps it from
  regressing — the same detector `doctor` uses, failing CI on the next
  `bg-blue-500` instead of letting it quietly add an un-themed island.

The token vocabulary and the full "looks themeable but bakes at build time" table
these tools encode live in **[AGENTS.md](../AGENTS.md)** — which `init` drops
into your repo so your coding agent follows them too ([below](#agent)).

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
users). Themes a visitor imports or authors are preserved alongside them. A theme
can change as much or as little as you like — only colors for a quick re-skin, or
also radius, shadow, border width, type, and motion for a full redesign; anything
you omit falls back to the schema default.

To also kill the flash on a visitor's *first-ever* load (before anything is
saved), pass the same default theme to the anti-flash wiring. It runs before
React and can't read the provider prop, so keep the two in sync:

```ts
veneer({ defaultTheme: themes[0] })            // Vite:  vite.config.ts plugin
<AntiFlashScript defaultTheme={themes[0]} />   // Next:  app/layout.tsx <head>
```

> Want a random theme on every visit until the visitor picks one? See
> [Shuffle mode](#shuffle).

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
`current`, `enabledThemes`, `setCurrent`, `hydrated`, the import/preview actions,
and — for shuffle — `pinned` and `shuffle()`), `applyTheme`, `defineTheme`,
`validateTheme`, `parseAndValidate` / `fetchTheme` / `isFetchableUrl`,
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
of the current theme into React's tree — its `name`, swatches built from its
specific colors, or a branch keyed on `useTheme().pinned`. Those values are
client-only (they come from `localStorage`, and for shuffle a per-load random
pick), so the server renders the default while the first client render already
holds the real theme — a mismatch.

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

<a id="shuffle"></a>

<details>
<summary><b>Shuffle mode: a random theme until the visitor pins one</b></summary>

For a showcase, show a **random theme on every visit** until the visitor pins one
by selecting it. It stays flash-free: the anti-flash wiring inlines the pool and
applies a random pick before first paint. Pass the same pool to both the
anti-flash wiring and the provider's `shuffleIds`:

```ts
// Vite — vite.config.ts
veneer({ shuffleUntilPinned: themes })
```
```tsx
// Next — app/layout.tsx <head>
<AntiFlashScript shuffleUntilPinned={themes} />
```
```tsx
// both — the provider draws the in-page shuffle from the same pool
<ThemeProvider themes={themes} shuffleIds={themes.map((t) => t.id)}>
  {children}
</ThemeProvider>
```

Selecting a theme **pins** it (`useTheme().pinned` → `true`) and saves it, which
stops the shuffle; `useTheme().shuffle()` re-rolls and returns to the unpinned
state — wire it to a "Shuffle" button. Omit `shuffleUntilPinned` entirely for the
ordinary behavior (apply the saved theme, no shuffling). The generic form is
`getAntiFlashScript(undefined, themes.map((t) => ({ id: t.id, tokens: t.tokens })))`.

</details>
