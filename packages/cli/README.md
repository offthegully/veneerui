# veneerui

CLI to add [Veneer UI](https://www.npmjs.com/package/@offthegully/veneerui) theming to an
**existing Vite or Next + Tailwind v4 app**. Veneer is a drop-in add-on, not a
scaffolder — you keep your own project and the CLI does the wiring, shadcn-style.
Everything it does is also documented as manual steps, so you can always do it by
hand.

```sh
npm i @offthegully/veneerui
npx veneerui init            # wire Veneer into this project
npx veneerui add switcher    # copy a ThemeSwitcher into your components
npx veneerui add fonts       # print install + imports for the built-in themes' fonts
npx veneerui doctor          # see how much of your UI is themeable today
npx veneerui migrate         # rewrite the mechanical gotchas to tokens
```

## Commands

| Command | What it does |
|---|---|
| `veneerui init` | Detect Vite/Next, add `@import "@offthegully/veneerui/tokens.css"` to your global stylesheet, wire the anti-flash (Vite: the `veneer()` plugin; Next: a printed `<AntiFlashScript/>` snippet), and print the `<ThemeProvider>` wrapper. Idempotent; supports `--dry-run`. |
| `veneerui add <component…>` | Copy UI components (and their registry dependencies) into your project. They import their logic from `@offthegully/veneerui`; you own and can restyle the markup. On a **Next** project it prepends `'use client'` (RSC needs it; inert elsewhere). `--force` overwrites; `--dir <path>` sets the target. |
| `veneerui add fonts` | Print the `npm i` command and exact `@fontsource` import lines for every family the built-in themes name, plus the `font-sans` footgun. Themes can only *name* a font — the app must load it — and the family must match exactly; this removes the guesswork. See [docs/fonts.md](https://github.com/offthegully/veneerui/blob/main/docs/fonts.md). |
| `veneerui doctor` | Scan the project and report roughly **how much of your UI is themeable today** — counts hardcoded colors, baked shadows, fixed widths, and arbitrary sizes, and warns about `@theme` blocks (e.g. shadcn) that redefine reserved Veneer token names. The honest reality-check: `init` only wires Veneer in; this tells you how much migration is left. |
| `veneerui migrate` | Rewrite the deterministic gotchas inside `className`s (`shadow-md` → `[box-shadow:var(--shadow-md)]`, `border` → `[border-width:var(--border-width-default)]`, `duration-200` → the calc form) and **flag** the judgment calls (which palette → which semantic color, which scale step) for you to finish. `--dry-run` previews. |
| `veneerui list` | List the components available to `add`. |

Flags: `--cwd <path>` to target another directory, `--dry-run`, `--force`,
`--dir <path>`.

To stop new islands from creeping back in after a migration, add
[`eslint-plugin-veneer`](https://github.com/offthegully/veneerui/tree/main/packages/eslint-plugin)
— the same hardcoded-color detector `doctor` uses, enforced in your editor and CI.

## Components

`switcher` (theme dropdown; pulls in `import-panel` + `gallery-panel`),
`gallery-panel` (grid that previews every theme and applies one on click),
`import-panel` (drop / paste-URL validate-and-preview modal), `banner` (preview
banner), `showcase` (a token-exercising demo surface). Run `veneerui list` for
the current set.

## Why components are copied, not imported

Tailwind v4 doesn't scan `node_modules`, so a component shipped *inside* a package
wouldn't have its utility classes generated in your build. Copying it into your
source — where Tailwind already scans — makes the classes generate and lets you
restyle freely. The runtime logic still comes from the `@offthegully/veneerui` dependency,
so there's no duplicated behavior.

Full setup guide (Vite, Next.js, and other React + Tailwind v4 apps):
[Integration guide](https://github.com/offthegully/veneerui/blob/main/docs/integration.md).

## License

MIT
