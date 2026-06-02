---
"create-veneerui": patch
---

Fix scaffolding silently producing a bare app on interactive runs.

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
