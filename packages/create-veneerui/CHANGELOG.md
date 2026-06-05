# create-veneerui

## 0.2.1

### Patch Changes

- ca6437b: Fix several first-run setup issues found in end-to-end testing of the Vite / Next /
  Expo scaffolds.

  - **`npm create veneerui … --framework <fw>` no longer silently scaffolds Vite.** npm
    drops flags passed without a `--` separator and exposes them as `npm_config_*` env
    vars; `create-veneerui` now recovers `--framework`/`--pm`/`--agent`/`--dry-run` from
    that env (and clears the vars so nested npm calls stop warning). The docs also show
    the `--` form.
  - **The `no-hardcoded-colors` lint gate now wires on Next.** `addEslintRule` recognizes
    the current create-next-app flat config (`const eslintConfig = defineConfig([…])`)
    instead of bailing to `VENEER-SETUP.md`, so the gate is active out of the box.
  - **The bundled `ImportPanel` no longer fails `npm run lint` on Next** (escaped the raw
    apostrophe that tripped `react/no-unescaped-entities`).
  - **Fresh Next apps theme their fonts.** The scaffolder strips create-next-app's
    `next/font` (Geist) pin and the `body { font-family }` / `--font-sans` overrides that
    silently defeated `font-sans` theming, and sets the page `<title>` to the app name.
  - **The Expo scaffold builds and runs again.** Pinned the Expo SDK template to `sdk-55`
    (NativeWind v5-preview doesn't bundle on SDK 56 / RN 0.85), added `babel-preset-expo`
    as a direct dependency, and gave the root `SafeAreaView` an inline `flex: 1` (its
    `className` is ignored by NativeWind v5-preview). Verified end-to-end in the iOS
    simulator: builds, bundles, renders, and re-skins live.

## 0.2.0

### Minor Changes

- beec13d: Wire the `no-hardcoded-colors` ESLint gate into the apps the CLIs set up, so the
  token invariant is enforced by CI — not just described in the agent guide.

  - `veneerui init` now adds `eslint-plugin-veneer`'s `recommended` preset to the
    project's ESLint flat config (the create-vite / create-next-app shapes are
    patched in place; an unfamiliar config falls back to a `VENEER-SETUP.md` step),
    and flags the `npm i -D eslint-plugin-veneer` install.
  - `npm create veneerui` installs `eslint-plugin-veneer` and wires the preset
    automatically, so a freshly scaffolded Vite or Next app fails lint on a stray
    `bg-blue-500` out of the box.

### Patch Changes

- e05efef: Fix a contrast bug in the shipped agent guide (`init` / scaffold inject it into a
  project's `AGENTS.md`). It described `text-text-on-primary` as covering status fills
  and omitted the per-status on-colors — so an agent following it would put white text
  on light success/warning/info fills. The guide now documents
  `text-text-on-success` / `-on-warning` / `-on-danger` / `-on-info` (each contrasts
  with _its own_ fill, not the page) and the status `-hover`/`-active`/`-subtle`
  states, and clarifies the `text-text-*`/`border-border-*` utility doubling.

  A new consumer-contract test guards the shipped guide against this class of drift:
  it asserts the guide carries every per-status on-color and every schema-generated
  escape-hatch form, so a future hand-edit can't silently drop them again.

- 053e255: Surface the new themeable tokens to consumers via the shipped agent guide (`init` /
  scaffold inject it into a project's `AGENTS.md`) and the copy-in registry components:

  - The agent guide now documents `text-text-on-accent` (distinct from
    `text-text-on-primary`), `surface-hover`/`surface-active`, `focus-ring-width`/`-offset`,
    and `icon-stroke-width`, including their escape-hatch forms. The consumer-contract test
    now guards `text-text-on-accent` against drift alongside the per-status on-colors.
  - Registry components (`showcase`, `switcher`, `gallery-panel`, `import-panel`) now use
    the correct on-fill text color for each fill (`text-text-on-accent`/`-on-success`/etc.,
    fixing white-on-light-fill contrast) and `surface-hover` for neutral interactive hovers,
    so `veneerui add` copies the corrected, more-themeable versions.

## 0.1.2

### Patch Changes

- 7e90ba6: Fix scaffolding silently producing a bare app on interactive runs.

  - **Vite:** pass `--no-interactive` to `create-vite`. v7+ prompts "Install with
    <pm> and start now?" in a TTY even with `--template`, then installs and launches
    the dev server itself; the user's Ctrl+C killed the whole process before Veneer
    was wired, leaving a plain Vite app.
  - **Expo:** pass `--yes` to `create-expo-app` so the new "Select an Expo SDK
    version" prompt no longer blocks non-interactive/agent runs (takes the latest
    default; `--template` still overrides).
  - **Expo:** install the build-only `@offthegully/veneerui` dev dep with
    `--legacy-peer-deps` on npm. Its web `react-dom` peer pulled `react-dom@latest`,
    whose `react@^19.x.y` peer outranked the older react Expo pins, hard-failing
    `ERESOLVE`. The web peers are irrelevant on native (the codegen reads only theme
    data), so npm is told to install through them.

## 0.1.1

### Patch Changes

- 22875ad: Add Expo support and update themes.
