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
import {
  expoRecoveryCommands,
  FRAMEWORK_PROFILES,
  resolvePm,
  runHint,
  runScaffold,
  SETUP_FILE,
} from '@veneerui/setup-core';
import type { PackageManager, ScaffoldFramework } from '@veneerui/setup-core';
import { parse, validateAgent, validateName, validatePm, type Parsed } from './args';

type FrameworkChoice = ScaffoldFramework | 'other';

const HELP = `create-veneerui — scaffold a themed Vite, Next, React Router, or Expo app, wired for Veneer

Usage:
  npm create veneerui@latest [name] [options]

Options:
  --framework <vite|next|react-router|expo|other>  Skip the framework prompt
  --yes, --defaults              Non-interactive (name required; framework defaults to vite)
  --pm <npm|pnpm|yarn|bun>       Override the detected package manager
  --no-install                   Skip dependency install
  --agent[=claude|codex|auto|none]  After wiring, hand off to an installed agent to finish/customize
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

function nextSteps(
  name: string,
  pm: PackageManager,
  framework: ScaffoldFramework,
  setupFileRemains: boolean,
  installed: boolean,
): string {
  // The outro is the only part of the log most users read — it must own the
  // setup-file state rather than declare "ready" over a leftover checklist, and
  // own the `--no-install` state rather than declare "ready" over missing deps.
  const setupNote = setupFileRemains
    ? `\n\nOne step couldn't be wired automatically — see ${SETUP_FILE} in the project\n` +
      `(or tell your AI agent: "Finish the Veneer setup in ${SETUP_FILE}, then verify\n` +
      `it and delete the file.")`
    : '';
  if (framework === 'expo') {
    const start = pm === 'npm' ? 'npm start' : `${pm} start`;
    // A deliberate, documented gap: the veneer/* ESLint gate isn't wired on native
    // yet, so the outro says who holds the token rules in the meantime.
    const gateNote =
      `\n\nNote: the veneer/* ESLint gate isn't wired on native yet — AGENTS.md carries\n` +
      `the token rules for you (and your agent) until it is.`;
    if (!installed) {
      // Not "ready": nothing was installed, and a bare `<pm> install` wouldn't be
      // enough — print the same recovery commands the scaffold log showed.
      return (
        `Scaffolded — dependencies were NOT installed (--no-install). Finish with:\n\n` +
        `  cd ${name}\n` +
        expoRecoveryCommands(pm)
          .map((c) => `  ${c}`)
          .join('\n') +
        `\n  ${start}${gateNote}${setupNote}`
      );
    }
    return (
      `Done — your themed Expo app is ready.\n\n` +
      `  cd ${name}\n  ${start}\n\n` +
      `Press i (iOS) / a (Android), or scan with Expo Go. Tap the ThemeSwitcher and watch\n` +
      `color, radius, border and shadow re-skin. Build screens from token utilities\n` +
      `(bg-surface, text-text, rounded-md, …) — see AGENTS.md. \`${runHint(pm, 'gen:tokens')}\` refreshes\n` +
      `the token data after upgrading Veneer.${gateNote}${setupNote}`
    );
  }
  const dev = pm === 'npm' ? 'npm run dev' : `${pm} dev`;
  if (!installed) {
    return (
      `Scaffolded — dependencies were NOT installed (--no-install). They're recorded\n` +
      `in package.json, so finish with:\n\n` +
      `  cd ${name}\n  ${pm} install\n  ${dev}\n\n` +
      `Then switch themes with the ThemeSwitcher and build UI from token utilities\n` +
      `(bg-surface, text-text, rounded-md, …) — see AGENTS.md for the rules.${setupNote}`
    );
  }
  return (
    `Done — your themed app is ready.\n\n` +
    `  cd ${name}\n  ${dev}\n\n` +
    `Open it, switch themes with the ThemeSwitcher, then build UI from token utilities\n` +
    `(bg-surface, text-text, rounded-md, …) — see AGENTS.md for the rules.${setupNote}`
  );
}

function otherGuidance(): string {
  return [
    'Veneer runs on any React 19 + Tailwind v4 app. Automated scaffolding supports Vite,',
    'Next.js, and React Router 7; for another framework (TanStack Start, Astro, Gatsby, …):',
    '',
    "  1. Scaffold it with that framework's official tool",
    '  2. Inside it, run:  npx veneerui init',
    '     (TanStack Start is recognized and auto-wired; anything else gets what init can',
    '     wire plus a VENEER-SETUP.md for you — or your agent — to finish)',
    '',
    'For SSR frameworks the anti-flash script goes in your document <head> (not the Vite',
    'plugin) — init writes the exact step. Only React 19 + Tailwind v4 is required.',
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
  return rest.find(
    (a) =>
      a === 'vite' ||
      a === 'next' ||
      a === 'react-router' ||
      a === 'remix' ||
      a === 'expo' ||
      a === 'other',
  );
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
  const yes = take('yes');
  if (o.framework === undefined && fw) o.framework = fw === 'true' ? strayFramework() : fw;
  // Recovered values go through the SAME validation as argv flags — a swallowed
  // typo must not silently pick a different agent/package manager. (We only read
  // the specific keys above, so npm's own env noise — it sets many npm_config_*
  // vars of its own — can never trip an error here.)
  if (o.pm === undefined && pm && pm !== 'true') {
    const err = validatePm(pm);
    if (err) o.error ??= err;
    else o.pm = pm;
  }
  if (o.agent === undefined && agent) {
    const v = agent === 'true' ? 'auto' : agent;
    const err = validateAgent(v);
    if (err) o.error ??= err;
    else if (v !== 'none') o.agent = v as Parsed['agent'];
  }
  if (!o.dryRun && dryRun === 'true') o.dryRun = true;
  if (o.install && install === 'false') o.install = false;
  // npm consumes `--yes` itself (it's a real npm-init config), but the user's intent
  // is "don't prompt me" — without this, `npm create veneerui my-app --yes` still
  // opens the interactive framework select.
  if (!o.yes && yes === 'true') o.yes = true;
}

async function main(): Promise<void> {
  const o = parse(process.argv.slice(2));
  recoverSwallowedFlags(o);
  if (o.version) return void console.log(version());
  if (o.help) return void console.log(HELP);

  // Prompts need BOTH ends of the terminal: stdout to draw, stdin to read — with a
  // piped stdin (`echo | npm create …`, CI) a prompt would just EOF-cancel.
  const interactive = !o.yes && Boolean(process.stdout.isTTY) && Boolean(process.stdin.isTTY);
  intro('create-veneerui — a themed Tailwind v4 app, wired end-to-end');

  // A parse error (unknown flag, bad --agent/--pm value) — never silently drop it.
  if (o.error) {
    cancel(o.error);
    process.exitCode = 1;
    return;
  }

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
    const res = await text({
      message: 'Project name?',
      placeholder: 'my-veneer-app',
      // A real accept-on-Enter default — a `placeholder` alone is hint text, and
      // Enter on it submits an empty value (which then errors). clack validates
      // BEFORE substituting the default, so empty has to pass validation.
      defaultValue: 'my-veneer-app',
      validate: (v) => (v ? validateName(v) : undefined),
    });
    if (isCancel(res)) return void cancel('Cancelled.');
    name = res;
  } else {
    cancel('A project name is required, e.g. `npm create veneerui@latest my-app`.');
    process.exitCode = 1;
    return;
  }

  // Framework. `remix` is accepted as a friendly alias for React Router 7 (its successor).
  let framework = o.framework as FrameworkChoice | undefined;
  if (framework === ('remix' as FrameworkChoice)) framework = 'react-router';
  if (framework && !['vite', 'next', 'react-router', 'expo', 'other'].includes(framework)) {
    cancel(`Unknown framework "${framework}" — expected vite, next, react-router, expo, or other.`);
    process.exitCode = 1;
    return;
  }
  if (!framework) {
    if (interactive) {
      // Web frameworks come from the profile registry (labels/hints live in ONE
      // place); Expo and "other" are the two paths outside the web wiring engine.
      const web = FRAMEWORK_PROFILES.filter((p) => p.scaffold).map((p) => ({
        value: p.id as FrameworkChoice,
        label: p.label,
        hint: p.hint,
      }));
      // Vite first + pre-highlighted: Enter on the top row must pick the same
      // default non-interactive `--yes` uses, not whatever leads the registry.
      web.sort((a, b) => Number(b.value === 'vite') - Number(a.value === 'vite'));
      const res = await select({
        message: 'Which framework?',
        initialValue: 'vite' as FrameworkChoice,
        options: [
          ...web,
          { value: 'expo', label: 'Expo (React Native)', hint: 'NativeWind — same tokens on native (experimental)' },
          { value: 'other', label: 'Other React framework', hint: 'TanStack Start, Astro, … — scaffold there, then `veneerui init`' },
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
  // `--dry-run` writes nothing, so it may run over an existing directory — the
  // "check what WOULD happen before removing my old attempt" case.
  if (!o.dryRun && existsSync(join(parentDir, name))) {
    cancel(`A directory named "${name}" already exists here — pick another name, or remove it first.`);
    process.exitCode = 1;
    return;
  }

  const pm = resolvePm(undefined, o.pm);
  let appDir: string;
  try {
    ({ appDir } = runScaffold({
      parentDir,
      name,
      framework,
      pm,
      install: o.install,
      agent: o.agent ?? null,
      dryRun: o.dryRun,
    }));
  } catch (err) {
    // Scaffolding can die partway (network, a delegate's non-zero exit) AFTER the
    // app dir was created — say so, or the next run hits "already exists" cold.
    const partial =
      !o.dryRun && existsSync(join(parentDir, name))
        ? `\nA partial project may be left at ${join(parentDir, name)} — remove it before retrying.`
        : '';
    cancel(`Setup failed: ${err instanceof Error ? err.message : String(err)}${partial}`);
    process.exitCode = 1;
    return;
  }

  if (o.dryRun) outro('Dry run complete — nothing was written.');
  else outro(nextSteps(name, pm, framework, existsSync(join(appDir, SETUP_FILE)), o.install));
}

main().catch((err: unknown) => {
  // The same clack cancel framing as every in-flow error — a bare err.message
  // with no styling reads like a crash in someone else's tool.
  cancel(`Setup failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
