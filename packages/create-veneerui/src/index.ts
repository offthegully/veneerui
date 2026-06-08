/**
 * `create-veneerui` — the one-command scaffolder behind `npm create veneerui`.
 *
 * Asks for a name + framework (or takes them as flags), delegates project
 * creation to the official scaffolder, then wires Veneer end-to-end via
 * `@veneerui/setup-core`. `@clack/prompts` drives the interactive UI; flags make
 * the same flow fully non-interactive and agent-runnable.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cancel, intro, isCancel, outro, select, text } from '@clack/prompts';
import { resolvePm, runScaffold } from '@veneerui/setup-core';
import type { ScaffoldFramework } from '@veneerui/setup-core';
import { parse, validateName, type Parsed } from './args';

type FrameworkChoice = ScaffoldFramework | 'other';

const HELP = `create-veneerui — scaffold a themed Vite, Next, or Expo app, wired for Veneer

Usage:
  npm create veneerui@latest [name] [options]

Options:
  --framework <vite|next|expo|other>  Skip the framework prompt
  --yes, --defaults              Non-interactive (name required; framework defaults to vite)
  --pm <npm|pnpm|yarn|bun>       Override the detected package manager
  --no-install                   Skip dependency install
  --agent[=claude|codex]         After wiring, hand off to an installed agent to finish/customize
  --dry-run                      Print what would happen; change nothing
  -h, --help                     Show this help
  -v, --version                  Show the version`;

function version(): string {
  try {
    const pkg = readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8');
    return (JSON.parse(pkg) as { version: string }).version;
  } catch {
    return '0.0.0';
  }
}

function nextSteps(name: string, pm: string, framework: ScaffoldFramework): string {
  if (framework === 'expo') {
    const start = pm === 'npm' ? 'npm start' : `${pm} start`;
    return (
      `Done — your themed Expo app is ready.\n\n` +
      `  cd ${name}\n  ${start}\n\n` +
      `Press i (iOS) / a (Android), or scan with Expo Go. Tap the ThemeSwitcher and watch\n` +
      `color, radius, border and shadow re-skin. Build screens from token utilities\n` +
      `(bg-surface, text-text, rounded-md, …) — see AGENTS.md. \`npm run gen:tokens\` refreshes\n` +
      `the token data after upgrading Veneer.`
    );
  }
  const dev = pm === 'npm' ? 'npm run dev' : `${pm} dev`;
  return (
    `Done — your themed app is ready.\n\n` +
    `  cd ${name}\n  ${dev}\n\n` +
    `Open it, switch themes with the ThemeSwitcher, then build UI from token utilities\n` +
    `(bg-surface, text-text, rounded-md, …) — see AGENTS.md for the rules.`
  );
}

function otherGuidance(): string {
  return [
    'Veneer runs on any React 19 + Tailwind v4 app. Automated scaffolding currently',
    'supports Vite and Next.js; for another framework (Remix, Astro, TanStack Start, …):',
    '',
    "  1. Scaffold it with that framework's official tool",
    '  2. Inside it, run:  npx veneerui init',
    '     (wires what it can and writes VENEER-SETUP.md for you — or your agent — to finish)',
  ].join('\n');
}

/**
 * The framework npm left as a stray positional when it swallowed a bare
 * `--framework <name>`. The space form (`--framework next`, no `--`) sets
 * `npm_config_framework=true` and detaches the value as a positional; the first
 * positional is the project name, so a later one matching a known framework is the
 * lost value.
 */
function strayFramework(): string | undefined {
  const rest = process.argv.slice(2).filter((a) => !a.startsWith('-')).slice(1);
  return rest.find((a) => a === 'vite' || a === 'next' || a === 'expo' || a === 'other');
}

/**
 * Recover flags npm swallowed when they weren't passed after a `--` separator.
 * `npm create <pkg>` only forwards flags to the created tool after `--`
 * (`npm create veneerui my-app -- --framework next`). Without it npm consumes
 * `--framework`/`--pm`/… as unknown config and exposes each as an `npm_config_*` env
 * var — but how the *value* survives depends on the form:
 *   - `--framework=next` (equals): npm keeps it → `npm_config_framework=next`.
 *   - `--framework next` (space):  npm sets `npm_config_framework=true` and detaches
 *     `next` as a stray positional, so the value survives only in argv.
 * We recover it either way (instead of silently falling back to the default, Vite —
 * the most common first-run gotcha), and delete the vars so the nested npm calls we
 * spawn (create-vite/-next/-expo, npm install) don't re-warn "Unknown env config".
 */
function recoverSwallowedFlags(o: Parsed): void {
  const take = (key: string): string | undefined => {
    const k = `npm_config_${key}`;
    const v = process.env[k];
    delete process.env[k];
    return v || undefined;
  };
  const fw = take('framework');
  const pm = take('pm');
  const agent = take('agent');
  const dryRun = take('dry_run');
  const install = take('install');
  if (o.framework === undefined && fw) o.framework = fw === 'true' ? strayFramework() : fw;
  if (o.pm === undefined && pm && pm !== 'true') o.pm = pm;
  if (o.agent === undefined && agent) o.agent = (agent === 'true' ? 'auto' : agent) as Parsed['agent'];
  if (!o.dryRun && dryRun === 'true') o.dryRun = true;
  if (o.install && install === 'false') o.install = false;
}

async function main(): Promise<void> {
  const o = parse(process.argv.slice(2));
  recoverSwallowedFlags(o);
  if (o.version) return void console.log(version());
  if (o.help) return void console.log(HELP);

  const interactive = !o.yes && Boolean(process.stdout.isTTY);
  intro('create-veneerui — a themed Tailwind v4 app, wired end-to-end');

  // Project name.
  let name = o.name;
  if (name) {
    const err = validateName(name);
    if (err) {
      cancel(err);
      process.exitCode = 1;
      return;
    }
  } else if (interactive) {
    const res = await text({ message: 'Project name?', placeholder: 'my-veneer-app', validate: validateName });
    if (isCancel(res)) return void cancel('Cancelled.');
    name = res;
  } else {
    cancel('A project name is required, e.g. `npm create veneerui@latest my-app`.');
    process.exitCode = 1;
    return;
  }

  // Framework.
  let framework = o.framework as FrameworkChoice | undefined;
  if (framework && !['vite', 'next', 'expo', 'other'].includes(framework)) {
    cancel(`Unknown framework "${framework}" — expected vite, next, expo, or other.`);
    process.exitCode = 1;
    return;
  }
  if (!framework) {
    if (interactive) {
      const res = await select({
        message: 'Which framework?',
        options: [
          { value: 'vite', label: 'Vite + React', hint: 'fastest — fully wired' },
          { value: 'next', label: 'Next.js (App Router)', hint: 'SSR-safe — fully wired' },
          { value: 'expo', label: 'Expo (React Native)', hint: 'NativeWind — same tokens on native (experimental)' },
          { value: 'other', label: 'Other React framework', hint: 'Remix, Astro, TanStack — manual + agent' },
        ],
      });
      if (isCancel(res)) return void cancel('Cancelled.');
      framework = res as FrameworkChoice;
    } else {
      framework = 'vite';
    }
  }

  if (framework === 'other') return void outro(otherGuidance());

  const parentDir = process.cwd();
  if (existsSync(join(parentDir, name))) {
    cancel(`A directory named "${name}" already exists here.`);
    process.exitCode = 1;
    return;
  }

  const pm = resolvePm(undefined, o.pm);
  try {
    runScaffold({
      parentDir,
      name,
      framework,
      pm,
      install: o.install,
      agent: o.agent ?? null,
      dryRun: o.dryRun,
    });
  } catch (err) {
    cancel(`Setup failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
    return;
  }

  if (!o.dryRun) outro(nextSteps(name, pm, framework));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
