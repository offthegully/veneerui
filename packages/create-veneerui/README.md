# create-veneerui

Scaffold a new **themed** React + Tailwind v4 app, wired for
[Veneer UI](https://www.npmjs.com/package/@offthegully/veneerui) — one command:

```sh
npm create veneerui@latest my-app
```

Pick a framework — **Vite + React** or **Next.js (App Router)** — and it delegates to
that framework's official scaffolder, installs Veneer, wires the tokens `@import`, the
`<ThemeProvider>`, and the anti-flash script, drops in a `ThemeSwitcher`, and writes an
`AGENTS.md` of the token rules. Then:

```sh
cd my-app && npm run dev
```

It's themed from the first commit — open it, switch themes, and watch every surface
re-skin. No manual steps.

**Hand it to an agent.** Add `--agent[=claude|codex]` and an installed coding-agent CLI
finishes and verifies the setup (model-agnostic; prints a copy-paste prompt if none is
installed).

**Flags:** `--framework <vite|next>` · `--pm <npm|pnpm|yarn|bun>` · `--no-install` ·
`--dry-run` · `--yes`

**React Native / Expo?** Not a scaffolder option yet (web only). Wire it manually —
quickstart + a copy-and-run POC in the
[Expo guide](https://github.com/offthegully/veneerui/blob/main/docs/expo.md).

Already have an app? Use the [`veneerui`](https://www.npmjs.com/package/veneerui) CLI
(`npx veneerui init`) instead. Full docs:
[Veneer integration guide](https://github.com/offthegully/veneerui/blob/main/docs/integration.md).

## License

MIT
