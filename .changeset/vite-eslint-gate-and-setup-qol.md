---
"veneerui": patch
"create-veneerui": patch
---

Fix the Vite lint gate (create-vite v8 ships oxlint, not ESLint) and clean up
the setup UX:

- Vite scaffolds now install `eslint` + `typescript-eslint`, write the minimal
  flat config with the `veneer/*` preset, and chain `eslint` into the template's
  oxlint `lint` script — so the themeability gate is live out of the box again
  and no leftover `VENEER-SETUP.md` is written. The no-ESLint handling is now
  template-detected (shared with React Router) instead of framework-special-cased.
- The `create-veneerui` outro now surfaces `VENEER-SETUP.md` when a step
  couldn't be wired, instead of unconditionally declaring the app ready; a note
  after the delegate scaffolder tells users to ignore its "next steps"; dry-run
  closes with its own outro.
- Spawned npm installs pass `--no-audit --no-fund`, so the wiring log is no
  longer buried under audit/funding banners (printed install *hints* are
  unchanged).
- `npm create veneerui my-app --yes` without the `--` separator is now honored
  (npm swallows `--yes`; it's recovered like the other flags).
- The interactive framework prompt derives from the framework profile registry
  (no more hand-duplicated labels), and the "Other" option no longer describes
  TanStack Start as manual — `veneerui init` auto-wires it.
- `veneerui init` on an unrecognized project names all four auto-wired
  frameworks (was "Vite or Next"); printed docs pointers are full URLs instead
  of repo-relative paths; the Expo `--dry-run` prints the exact install
  commands (including `--legacy-peer-deps`); VENEER-SETUP.md's verify section
  no longer references a `typecheck` script scaffolds don't have.
