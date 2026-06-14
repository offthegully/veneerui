# Deploying the playground

The playground at **[veneerui.dev](https://veneerui.dev)** is the `apps/playground`
Vite SPA, built into a container and hosted on [Fly.io](https://fly.io). The same
deploy serves the published JSON Schema at
`https://veneerui.dev/schemas/theme-v1.json` (see [Hosting the JSON
Schema](./publishing.md#hosting-the-json-schema)).

> This only concerns the demo site. The npm packages are published separately and
> independently — see [publishing.md](./publishing.md).

## The moving parts

| File | What it does |
|---|---|
| [`Dockerfile`](../Dockerfile) | Two-stage build: compile the theme runtime + SPA in `node:22`, then serve the static `dist/` from `nginx:alpine`. |
| [`nginx.conf`](../nginx.conf) | SPA fallback (`try_files … /index.html`), immutable caching for hashed `/assets/`, JSON content type for `/schemas/`, listens on `8080`. |
| [`fly.toml`](../fly.toml) | Fly app config — app name `veneerui`, region `iad`, HTTPS, `internal_port = 8080`, auto stop/start machines. |
| [`.dockerignore`](../.dockerignore) | Keeps `node_modules`/`dist`/docs out of the build context; `npm ci` rebuilds modules in-image. |
| [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | On push to `main`, runs `flyctl deploy --remote-only`. |

The build needs the **whole monorepo**, not just `apps/playground`: the playground
imports the `@offthegully/veneerui` workspace package, and `build:theme`'s
`gen:builtin` reads the `gallery/`. So the Dockerfile copies `packages/`, `apps/`,
`scripts/`, and `gallery/`, runs `npm ci`, then `npm run build:theme && npm run
build -w playground`. (It deliberately skips the CLI/scaffolder builds — they
aren't part of the site.)

## How a deploy happens

Pushing to `main` triggers `deploy.yml`, which builds the `Dockerfile` on Fly's
remote builders and releases it. No SSH keys, droplet, or rsync — the only secret
is `FLY_API_TOKEN`.

```sh
# One-time CI secret (a deploy-scoped token):
fly tokens create deploy -x 999999h          # then add it as the FLY_API_TOKEN
gh secret set FLY_API_TOKEN                   # GitHub Actions repo secret
```

## First-time setup

```sh
# 1. Install + sign in.
brew install flyctl        # or: curl -L https://fly.io/install.sh | sh
fly auth login

# 2. Create the app (the fly.toml is already committed; don't let `launch`
#    overwrite it, and skip the immediate deploy).
fly apps create veneerui

# 3. Point the custom domain at the app and let Fly issue the cert.
fly certs add veneerui.dev
fly certs add www.veneerui.dev
#    Then add the A/AAAA (or CNAME) records Fly prints to your DNS provider.

# 4. First deploy.
fly deploy
```

## Deploying by hand

```sh
fly deploy                 # build remotely + release
fly deploy --local-only    # build with your local Docker instead
fly logs                   # tail the running machine
fly status                 # machines, regions, health
fly open                   # open the deployed site
```

## Testing the image locally

```sh
docker build -t veneerui .
docker run --rm -p 8080:8080 veneerui
# → http://localhost:8080  (and /schemas/theme-v1.json)
```

## Cost / availability knob

`fly.toml` sets `auto_stop_machines = "stop"` with `min_machines_running = 0`, so
idle machines stop and cold-start on the next request (a fraction of a second for a
static site). To keep the site always warm, set `min_machines_running = 1` and
redeploy.
