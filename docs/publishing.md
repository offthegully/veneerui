# Publishing

Veneer publishes **four** packages from this monorepo:

| Package | Dir | What it is |
|---|---|---|
| `@offthegully/veneerui` | `packages/theme` | the runtime + tokens (a dependency apps install) |
| `veneerui` | `packages/cli` | the `init`/`add`/`list` CLI for existing apps (`npx veneerui`) |
| `create-veneerui` | `packages/create-veneerui` | the `npm create veneerui` scaffolder for new apps |
| `eslint-plugin-veneer` | `packages/eslint-plugin` | the `veneer/no-hardcoded-colors` ESLint rule |

> `@veneerui/setup-core` (the shared setup logic) and `@veneerui/lint-core` are
> **private** (`"private": true`, never published); both are bundled into the CLI,
> scaffolder, and ESLint plugin at build time. [Changesets](https://github.com/changesets/changesets)
> ignores private packages automatically.

> The package names assume the `@offthegully` npm scope (owned) and the unscoped
> `veneerui` / `create-veneerui` / `eslint-plugin-veneer` names are available. npm
> renders each package's `README.md` as its landing page.

## How releases work

Versioning and publishing are **automated** with Changesets + GitHub Actions
([`.github/workflows/release.yml`](../.github/workflows/release.yml)). You don't run
`npm publish` by hand. The flow:

1. **Each PR that changes a published package carries a changeset** — a small
   markdown file declaring which packages changed and the bump type (patch/minor/
   major). Create one with `npm run changeset` and commit it.
2. **On merge to `main`**, the release workflow opens (or updates) a **"Version
   Packages" PR** that consumes the pending changesets: it bumps each affected
   package's version, writes `CHANGELOG.md` entries, and refreshes the lockfile.
3. **Merging the "Version Packages" PR** triggers the publish: the workflow runs
   `npm run release` (`npm run build && changeset publish`), which publishes **only
   the changed packages** to npm with [provenance](https://docs.npmjs.com/generating-provenance-statements),
   then creates git tags (e.g. `veneerui@0.1.4`) and GitHub Releases.

Because each package versions independently, an unchanged package is simply not
republished. The scoped `@offthegully/veneerui` publishes public via
`access: "public"` in [`.changeset/config.json`](../.changeset/config.json).

### Authentication: npm Trusted Publishing (OIDC)

There is **no `NPM_TOKEN` secret**. The workflow authenticates to npm over OIDC,
which also produces the provenance attestation. This requires a one-time setup
**per package** on npmjs.com → the package's *Settings → Trusted Publisher*:

- **Repository:** `offthegully/veneerui`
- **Workflow filename:** `release.yml`

All four packages already exist on npm, so their trusted publishers can be
configured now. Until a package's trusted publisher is set, its first OIDC publish
will fail. Renaming `release.yml` later means re-configuring each package.

### Cutting a release, step by step

```sh
# 1. On your feature branch, after making changes to a published package:
npm run changeset          # pick affected packages + bump type, write a summary
git add .changeset && git commit
# 2. Open the PR, get it reviewed, merge to main.
# 3. The bot opens a "Version Packages" PR — review the bumps/changelogs, merge it.
# 4. Watch the Release workflow publish + tag + create GitHub Releases.
```

No changeset is needed for docs-only, playground-only, or other non-published
changes. Run `npx changeset add --empty` if you want an explicit "no release" marker.

### Local sanity check (optional)

Before relying on CI you can verify the artifacts locally. From the repo root:

```sh
npm test && npm run typecheck && npm run lint
npm run build
```

`@offthegully/veneerui` ships `dist/`, `tokens.generated.css`, and `theme-v1.json` (its
`files` allowlist); `veneerui` and `create-veneerui` each ship `dist/`, `registry/`, and
`assets/` (the registry + agent guide are build-copied from `@veneerui/setup-core` by
`scripts/sync-setup-assets.ts`). The sync copies `assets/` **recursively**, so the Expo
scaffold templates (`assets/expo/`) ride along into `create-veneerui` automatically — no
allowlist change. Confirm tarball contents with `npm publish --dry-run -w @offthegully/veneerui`,
`-w veneerui`, and `-w create-veneerui`; the `create-veneerui` listing should include
`assets/expo/*`, and no published manifest should list the private `@veneerui/*` deps
(they're devDependencies, bundled by tsup).

> Build/publish order is handled for you: `npm run build` builds the theme runtime
> first (the CLI and scaffolder reference it), and `changeset publish` publishes in
> dependency order. The scaffolder **bundles** `@veneerui/setup-core`, so it has no
> runtime dependency on `veneerui`'s published version — the only coupling is the
> runtime semver string it installs into the new app.

## Versioning

Changeset bump types map directly to semver (`patch` / `minor` / `major`); the
guidance below tells you which to pick.

- **Each package follows semver and versions independently.** The CLI depends on the
  runtime only through the code it copies in and the `@import`/plugin it wires up, so
  the two can move at their own pace.
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
