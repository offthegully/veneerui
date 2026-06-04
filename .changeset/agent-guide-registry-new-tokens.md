---
"veneerui": patch
"create-veneerui": patch
---

Surface the new themeable tokens to consumers via the shipped agent guide (`init` /
scaffold inject it into a project's `AGENTS.md`) and the copy-in registry components:

- The agent guide now documents `text-text-on-accent` (distinct from
  `text-text-on-primary`), `surface-hover`/`surface-active`, `focus-ring-width`/`-offset`,
  and `icon-stroke-width`, including their escape-hatch forms. The consumer-contract test
  now guards `text-text-on-accent` against drift alongside the per-status on-colors.
- Registry components (`showcase`, `switcher`, `gallery-panel`, `import-panel`) now use
  the correct on-fill text color for each fill (`text-text-on-accent`/`-on-success`/etc.,
  fixing white-on-light-fill contrast) and `surface-hover` for neutral interactive hovers,
  so `veneerui add` copies the corrected, more-themeable versions.

`veneerui doctor` also warns on the new reserved token names (it reads the regenerated
reserved-token list).
