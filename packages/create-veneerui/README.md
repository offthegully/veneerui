# create-veneerui

Scaffold a new **themed** React + Tailwind v4 app, wired for
[Veneer UI](https://www.npmjs.com/package/@offthegully/veneerui) — one command:

```sh
npm create veneerui@latest my-app
```

Pick a framework — **Vite + React**, **Next.js (App Router)**, **React Router 7**, or
**Expo (React Native)** — and it delegates to that framework's official scaffolder, installs
Veneer, wires the tokens, the provider, and the anti-flash script (or, on Expo, the
NativeWind config + token codegen), drops in a `ThemeSwitcher`, and writes an `AGENTS.md`
of the token rules. (Picking **other** prints a checklist-driven path instead: scaffold
with that framework's own tool, then `npx veneerui init`.) Then:

```sh
cd my-app && npm run dev   # Expo: npm start
```

The project name must be **lowercase** (same rule as `create-next-app`).

It's themed from the first commit — open it, switch themes, and watch every surface
re-skin. No manual steps.

**Hand it to an agent.** Add `--agent[=claude|codex|auto|none]` and an installed coding-agent CLI
finishes and verifies the setup (model-agnostic; prints a copy-paste prompt if none is
installed).

**Flags:** `--framework <vite|next|react-router|expo|other>` (`remix` = React Router 7) ·
`--pm <npm|pnpm|yarn|bun>` · `--yes|-y` · `--no-install` (write the deps, skip installing —
on Expo it prints the exact install + codegen commands to run later) · `--dry-run`

> With npm, pass flags after a `--` separator so they reach the scaffolder cleanly, e.g.
> `npm create veneerui@latest my-app -- --framework next`. (Without `--`, npm consumes
> the flags as unknown config, but the scaffolder recovers them from npm's environment —
> the `--` form is still the most reliable.)

**Expo (React Native)** is **experimental** — it scaffolds via `create-expo-app` and wires
Veneer through NativeWind (the same token utilities as the web). See the
[Expo guide](https://github.com/offthegully/veneerui/blob/main/docs/expo.md).

Already have an app? Use the [`veneerui`](https://www.npmjs.com/package/veneerui) CLI
(`npx veneerui init`) instead. Full docs:
[Veneer integration guide](https://github.com/offthegully/veneerui/blob/main/docs/integration.md).

## License

MIT
