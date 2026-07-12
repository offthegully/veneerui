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
| `veneerui init` | Detect Vite/Next, add `@import "@offthegully/veneerui/tokens.css"` to your global stylesheet, wire the anti-flash (Vite: the `veneer()` plugin; Next: `<AntiFlashScript/>` in the layout `<head>`), and wrap your root in `<ThemeProvider>`. Patches the entry files when it recognizes their shape, else leaves that step in `VENEER-SETUP.md`. Idempotent; supports `--dry-run`. |
| `veneerui add <component…>` | Copy UI components (and their registry dependencies) into your project. They import their logic from `@offthegully/veneerui`; you own and can restyle the markup. On a **Next** project it prepends `'use client'` (RSC needs it; inert elsewhere). `--force` overwrites; `--dir <path>` sets the target. |
| `veneerui add fonts` | Print the `npm i` command and exact `@fontsource` import lines for every family the built-in themes name, plus the `font-sans` footgun. Themes can only *name* a font — the app must load it — and the family must match exactly; this removes the guesswork. See [docs/fonts.md](https://github.com/offthegully/veneerui/blob/main/docs/fonts.md). |
| `veneerui list` | List the components available to `add`. |

Flags: `--cwd <path>` to target another directory, `--dry-run`, `--force`,
`--dir <path>`.

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

`veneerui init` (adding Veneer to an **existing** app) is web-only (Vite / Next). For a
**new Expo (React Native)** app, `npm create veneerui@latest my-app -- --framework expo`
scaffolds and wires it through NativeWind (experimental) — see the
[Expo guide](https://github.com/offthegully/veneerui/blob/main/docs/expo.md).

Full setup guide (Vite, Next.js, and other React + Tailwind v4 apps):
[Integration guide](https://github.com/offthegully/veneerui/blob/main/docs/integration.md).

## License

MIT
