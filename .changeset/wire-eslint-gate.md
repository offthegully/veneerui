---
"veneerui": minor
"create-veneerui": minor
---

Wire the `no-hardcoded-colors` ESLint gate into the apps the CLIs set up, so the
token invariant is enforced by CI — not just described in the agent guide.

- `veneerui init` now adds `eslint-plugin-veneer`'s `recommended` preset to the
  project's ESLint flat config (the create-vite / create-next-app shapes are
  patched in place; an unfamiliar config falls back to a `VENEER-SETUP.md` step),
  and flags the `npm i -D eslint-plugin-veneer` install.
- `npm create veneerui` installs `eslint-plugin-veneer` and wires the preset
  automatically, so a freshly scaffolded Vite or Next app fails lint on a stray
  `bg-blue-500` out of the box.
