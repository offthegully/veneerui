# veneerui

## 0.2.0

### Minor Changes

- 674528c: Remove the `doctor` and `migrate` CLI commands. The CLI now focuses on the new-app /
  new-theme path: `init`, `add`, and `list` remain unchanged, and the
  `no-hardcoded-colors` ESLint rule plus the conformance test still enforce the
  "token utilities only" invariant. The migration tooling (the existing-app codemod
  and themeability scan) is preserved on the `migration` branch.
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

## 0.1.4

### Patch Changes

- 22875ad: Add Expo support and update themes.
