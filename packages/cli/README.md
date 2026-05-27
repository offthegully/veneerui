# veneer

CLI to add [Veneer](https://www.npmjs.com/package/@veneer/theme) theming to an
**existing Vite or Next + Tailwind v4 app**. Veneer is a drop-in add-on, not a
scaffolder — you keep your own project and the CLI does the wiring, shadcn-style.
Everything it does is also documented as manual steps, so you can always do it by
hand.

```sh
npm i @veneer/theme
npx veneer init            # wire Veneer into this project
npx veneer add switcher    # copy a ThemeSwitcher into your components
```

## Commands

| Command | What it does |
|---|---|
| `veneer init` | Detect Vite/Next, add `@import "@veneer/theme/tokens.css"` to your global stylesheet, wire the anti-flash (Vite: the `veneer()` plugin; Next: a printed `<AntiFlashScript/>` snippet), and print the `<ThemeProvider>` wrapper. Idempotent; supports `--dry-run`. |
| `veneer add <component…>` | Copy UI components (and their registry dependencies) into your project. They import their logic from `@veneer/theme`; you own and can restyle the markup. `--force` overwrites; `--dir <path>` sets the target. |
| `veneer list` | List the components available to `add`. |

Flags: `--cwd <path>` to target another directory, `--dry-run`, `--force`,
`--dir <path>`.

## Components

`switcher` (theme dropdown — also adds `import-panel`), `import-panel` (drop /
paste-URL validate-and-preview modal), `banner` (preview banner), `showcase`
(a token-exercising demo surface). Run `veneer list` for the current set.

## Why components are copied, not imported

Tailwind v4 doesn't scan `node_modules`, so a component shipped *inside* a package
wouldn't have its utility classes generated in your build. Copying it into your
source — where Tailwind already scans — makes the classes generate and lets you
restyle freely. The runtime logic still comes from the `@veneer/theme` dependency,
so there's no duplicated behavior.

Full setup guides:
[Vite](https://github.com/your-org/veneer/blob/main/docs/integration-vite.md) ·
[Next.js](https://github.com/your-org/veneer/blob/main/docs/integration-next.md).

## License

MIT
