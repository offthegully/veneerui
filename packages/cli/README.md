# veneerui

CLI to add [Veneer UI](https://www.npmjs.com/package/@offthegully/veneerui) theming to an
**existing React + Tailwind v4 app** — it wires the tokens, the `<ThemeProvider>`,
and the anti-flash script for you, shadcn-style (you keep your own project).

> **Starting a new app?** Use `npm create veneerui@latest` instead — it scaffolds the
> app and runs this same wiring end-to-end.

Everything it does is also documented as manual steps, so you can always do it by hand.

```sh
npm i @offthegully/veneerui
npx veneerui init            # wire Veneer into this project
npx veneerui add switcher    # copy a ThemeSwitcher into your components
npx veneerui add fonts       # print install + imports for the built-in themes' fonts
```

## Commands

| Command | What it does |
|---|---|
| `veneerui init` | Detect your framework — Vite, Next.js (App Router), React Router 7, or TanStack Start — add `@import "@offthegully/veneerui/tokens.css"` to your global stylesheet, wire the anti-flash (Vite: the `veneer()` plugin; Next and other SSR roots: the script in the document `<head>`), and wrap your root in `<ThemeProvider>`. Anything else gets a generic checklist. Patches the entry files when it recognizes their shape, else leaves that step in `VENEER-SETUP.md`. Errors early on Tailwind v3 (v4 is required), and on an Expo / React Native app points you at the Expo guide instead. Idempotent; supports `--dry-run`. |
| `veneerui add <component…>` | Copy UI components (and their registry dependencies) into your project. They import their logic from `@offthegully/veneerui`; you own and can restyle the markup. On a **Next** project it prepends `'use client'` (RSC needs it; inert elsewhere). `--force` overwrites; `--dir <path>` sets the target. |
| `veneerui add fonts` | Print the `npm i` command and exact `@fontsource` import lines for every family the built-in themes name, plus the `font-sans` footgun. Themes can only *name* a font — the app must load it — and the family must match exactly; this removes the guesswork. See [docs/fonts.md](https://github.com/offthegully/veneerui/blob/main/docs/fonts.md). |
| `veneerui list` | List the components available to `add`. |

Flags: `--cwd <path>` to target another directory, `--dry-run`, `--force`,
`--dir <path>`, `--pm <npm|pnpm|yarn|bun>` (override the detected package manager
the printed install commands use).

By default `add` copies components into `src/components` when your project has a
`src/` directory, else `components/` (`app/components` on React Router); `--dir`
overrides.

## What `init` touches

Everything is a plain file edit — review with `git diff`, undo with `git checkout` —
and `--dry-run` previews it all first:

- **your global CSS** — the `@import "@offthegully/veneerui/tokens.css"` interlock
- **your entry / layout file** — wraps the root in `<ThemeProvider>` (on Next it may
  create `app/providers.tsx`)
- **the anti-flash wiring** — the `veneer()` Vite plugin, or the script in your
  document `<head>`
- **your ESLint flat config** — adds the `veneer.configs.recommended` themeability preset
- **`AGENTS.md` / `CLAUDE.md`** — creates or appends the token guide for coding agents
- **`VENEER-SETUP.md`** — written only when manual steps remain; a stale one is
  deleted once everything is wired

To stop new islands from creeping back in, add
[`eslint-plugin-veneer`](https://github.com/offthegully/veneerui/tree/main/packages/eslint-plugin)
— the same hardcoded-color detector the conformance test uses, enforced in your editor and CI.

## Components

`switcher` (theme dropdown; pulls in `gallery-panel`),
`gallery-panel` (grid that previews every theme and applies one on click),
`showcase` (a token-exercising demo surface). Run `veneerui list` for
the current set.

## Why components are copied, not imported

Tailwind v4 doesn't scan `node_modules`, so a component shipped *inside* a package
wouldn't have its utility classes generated in your build. Copying it into your
source — where Tailwind already scans — makes the classes generate and lets you
restyle freely. The runtime logic still comes from the `@offthegully/veneerui` dependency,
so there's no duplicated behavior.

`veneerui init` (adding Veneer to an **existing** app) is web-only: it auto-wires Vite,
Next.js (App Router), React Router 7, and TanStack Start, and gives any other React 19 +
Tailwind v4 app a checklist-driven `VENEER-SETUP.md`. For a **new Expo (React Native)**
app, `npm create veneerui@latest my-app -- --framework expo` scaffolds and wires it
through NativeWind (experimental) — see the
[Expo guide](https://github.com/offthegully/veneerui/blob/main/docs/expo.md).

Full setup guide (Vite, Next.js, React Router 7, and other React + Tailwind v4 apps):
[Integration guide](https://github.com/offthegully/veneerui/blob/main/docs/integration.md).

## License

MIT
