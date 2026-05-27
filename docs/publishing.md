# Publishing

Veneer publishes **two** packages from this monorepo:

| Package | Dir | What it is |
|---|---|---|
| `@veneer/theme` | `packages/theme` | the runtime + tokens (a dependency apps install) |
| `veneer` | `packages/cli` | the `init`/`add` CLI (run via `npx veneer`) |

> The package names assume the `@veneer` npm scope and the unscoped `veneer` name
> are available/owned. Verify (or rename) before the first publish. Also replace
> the `your-org/veneer` placeholder links in each package's `README.md` with the
> real repo URL, and add a `"repository"` field to both `package.json`s — npm
> renders the README as the package's landing page.

## Before publishing

Publishing is a manual, deliberate step (it's outward-facing and hard to undo).
From the repo root:

```sh
npm run gen:theme && npm run gen:registry   # regenerate all derived artifacts
npm test && npm run typecheck && npm run lint
npm run build                               # builds package + playground + CLI
```

`@veneer/theme` ships `dist/`, `tokens.generated.css`, and `theme-v1.json` (its
`files` allowlist); `veneer` ships `dist/` and `registry/`. Confirm with
`npm pack --dry-run -w @veneer/theme` and `-w veneer`.

## Publishing

```sh
npm publish -w @veneer/theme --access public
npm publish -w veneer        --access public
```

Publish `@veneer/theme` first — the CLI's copy-in components and the integration
docs reference it.

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

## Hosting the JSON Schema

Themes reference `"$schema": "https://veneer.app/schemas/theme-v1.json"` for
editor autocomplete and inline validation. Serve the generated
`packages/theme/theme-v1.json` at that URL (it's also shipped in the package as
`@veneer/theme/theme-v1.json`, so a host can pull it straight from the registry).
Until it's hosted, editors that can't fetch the URL simply skip autocomplete —
validation in the app and in CI is independent of it.
