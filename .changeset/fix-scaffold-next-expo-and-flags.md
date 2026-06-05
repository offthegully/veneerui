---
"veneerui": patch
"create-veneerui": patch
---

Fix several first-run setup issues found in end-to-end testing of the Vite / Next /
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
