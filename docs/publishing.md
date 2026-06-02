# Publishing

Veneer publishes **three** packages from this monorepo:

| Package | Dir | What it is |
|---|---|---|
| `@offthegully/veneerui` | `packages/theme` | the runtime + tokens (a dependency apps install) |
| `veneerui` | `packages/cli` | the `init`/`add`/`doctor`/`migrate` CLI for existing apps (`npx veneerui`) |
| `create-veneerui` | `packages/create-veneerui` | the `npm create veneerui` scaffolder for new apps |

> `@veneerui/setup-core` (the shared setup logic) and `@veneerui/lint-core` are
> **private** (`"private": true`, never published); both are bundled into the CLI and
> scaffolder at build time.

> The package names assume the `@offthegully` npm scope (owned) and the unscoped
> `veneerui` / `create-veneerui` names are available — verify both unscoped names are
> free before the first publish. npm renders each package's `README.md` as its landing page.

## Before publishing

Publishing is a manual, deliberate step (it's outward-facing and hard to undo).
From the repo root:

```sh
npm run gen:theme && npm run gen:registry   # regenerate all derived artifacts
npm test && npm run typecheck && npm run lint
npm run build                               # builds package + playground + CLI
```

`@offthegully/veneerui` ships `dist/`, `tokens.generated.css`, and `theme-v1.json` (its
`files` allowlist); `veneerui` and `create-veneerui` each ship `dist/`, `registry/`, and
`assets/` (the registry + agent guide are build-copied from `@veneerui/setup-core` by
`scripts/sync-setup-assets.ts`). The sync copies `assets/` **recursively**, so the Expo
scaffold templates (`assets/expo/`) ride along into `create-veneerui` automatically — no
allowlist change. Confirm with `npm pack --dry-run -w @offthegully/veneerui`, `-w veneerui`,
and `-w create-veneerui`; the `create-veneerui` listing should include `assets/expo/*`.

## Publishing

```sh
npm publish -w @offthegully/veneerui --access public
npm publish -w veneerui              --access public
npm publish -w create-veneerui       --access public
```

Publish `@offthegully/veneerui` first (the CLI and scaffolder install/reference it), then
`veneerui`, then `create-veneerui`. The scaffolder **bundles** `@veneerui/setup-core`, so
it has no runtime dependency on `veneerui`'s published version — the only coupling is the
runtime semver string it installs into the new app.

## Versioning

- **Both packages follow semver.** The CLI depends on the package only through
  the code it copies in and the `@import`/plugin it wires up, so they can version
  independently.
- **Adding tokens to the schema is a *minor* (additive) change.** Old themes keep
  working because every omitted token falls back to its default. Each theme
  records the `schemaVersion` it targeted.
- **`SCHEMA_VERSION`** (in `packages/theme/src/types.ts`) is the *schema
  generation*, not the package version. Bump it only on an **incompatible** schema
  change (renaming/removing a token, changing a token's type). That would be a
  major package release and a new published JSON Schema (`theme-v2.json`); the
  validator can then refuse or migrate themes carrying an unsupported
  `schemaVersion`. As long as changes stay additive, `SCHEMA_VERSION` stays `1`
  across many minor package releases.
- **The `./themes` subpath is a published API.** The Expo scaffold's token
  codegen (`gen:tokens`, in a user's app) imports `TOKEN_SCHEMA` + `BUILTIN_THEMES`
  from `@offthegully/veneerui/themes`, so adding tokens flows through to native on
  the next `npm run gen:tokens` with no scaffold change (additive = minor). Renaming
  the subpath or changing the shape of those exports **breaks `gen:tokens` in
  already-scaffolded Expo apps** — treat it as a major, breaking change.

## Updating the Expo scaffold's pinned versions

The Expo scaffolder pins three third-party versions that are **not tied to Veneer's
semver** — they track NativeWind v5's preview, which can ship a breaking newer build.
All three live in `packages/setup-core/src/scaffold-expo.ts`:

| Pin | Where | Why pinned |
|---|---|---|
| `nativewind@^5.0.0-preview.4` | `EXPO_NATIVE_DEPS` | not in Expo's SDK version map; `expo install` would float it to latest |
| `react-native-css@^3.0.7` | `EXPO_NATIVE_DEPS` | NativeWind's peer; same floating risk |
| `lightningcss` `1.30.1` | `patchExpoPackageJson` override | a known NativeWind-v5-preview build gotcha |

When NativeWind v5 advances (or ships **stable**): bump these, re-run the live
end-to-end smoke test (`npm create veneerui@latest tmp-app --framework expo`, then
`npm start` boots a themed app), update `scaffold-expo.test.ts`, and rebuild
`create-veneerui`. The SDK-managed deps (`react-native-reanimated`,
`react-native-worklets`, `react-native-safe-area-context`) stay **unpinned** so
`expo install` keeps matching the user's Expo SDK — don't pin those.

> This bump rides along in the next `create-veneerui` release; it has no effect on
> already-scaffolded apps (they pinned at scaffold time) and none on the
> `@offthegully/veneerui` runtime package.

## Hosting the JSON Schema

Themes reference `"$schema": "https://veneerui.dev/schemas/theme-v1.json"` for
editor autocomplete and inline validation. The playground (which *is*
veneerui.dev) serves this automatically: `generate-theme.ts` writes the schema to
`apps/playground/public/schemas/theme-v1.json`, Vite copies it to the dist root,
and the deploy rsyncs it — so it lands at the `$schema` URL. It's generated from
the same `TOKEN_SCHEMA` as `packages/theme/theme-v1.json` (and the package's
`@offthegully/veneerui/theme-v1.json`), so the served copy can't drift; just
re-run `npm run gen:theme` after a schema change. If the URL is ever unreachable,
editors simply skip autocomplete — validation in the app and in CI is independent
of it.
