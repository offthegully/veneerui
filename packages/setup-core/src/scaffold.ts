/**
 * Scaffold a fresh, fully-wired Veneer app — the engine behind
 * `npm create veneerui`. It **delegates project creation to the official
 * scaffolder** (create-vite / create-next-app) rather than reimplementing it,
 * sets up Tailwind v4 where the template omits it (Vite), then hands off to the
 * shared wiring engine — `runInit` — so a new app and an existing app go through
 * exactly the same code path. On top it installs the runtime, copies a switcher +
 * showcase, drops a token-driven starter page, and (with `--agent`) hands off to a
 * coding agent.
 *
 * The pure pieces — package-manager detection, the delegation command table, the
 * install args, the starter content — are unit-tested; the orchestration
 * (`runScaffold`) is validated end-to-end against the real scaffolders.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { detect } from './detect';
import { addTailwindVite } from './entry-patch';
import { runInit } from './init';
import { runAdd } from './add';
import { runAgentHandoff, type AgentChoice } from './agent';
import { runScaffoldExpo } from './scaffold-expo';

/** Frameworks wired through the shared web path (create-vite / create-next-app + runInit). */
export type WebFramework = 'vite' | 'next';
/** Every framework `create-veneerui` can scaffold. `expo` takes a separate native path. */
export type ScaffoldFramework = WebFramework | 'expo';
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

/** The runtime the scaffolded app installs. Pin only the runtime; `add`/wiring is in-process. */
const RUNTIME_PKG = '@offthegully/veneerui';
const TAILWIND_PKGS = ['tailwindcss', '@tailwindcss/vite'];
// The no-hardcoded-colors lint gate, installed dev-only; runInit wires the preset.
const ESLINT_PKG = 'eslint-plugin-veneer';
// Just the switcher (it pulls in its own panels). The full ThemeShowcase stays in
// the playground/docs — a new app shouldn't ship a demo component to delete.
const STARTER_COMPONENTS = ['switcher'];

export function isPackageManager(s: string | undefined): s is PackageManager {
  return s === 'npm' || s === 'pnpm' || s === 'yarn' || s === 'bun';
}

/** Detect the package manager from `npm_config_user_agent`; `override` (a flag) wins. */
export function resolvePm(
  userAgent: string | undefined = process.env.npm_config_user_agent,
  override?: string,
): PackageManager {
  if (isPackageManager(override)) return override;
  const tok = (userAgent ?? '').split('/')[0];
  return isPackageManager(tok) ? tok : 'npm';
}

function nextFlags(pm: PackageManager): string[] {
  const use = { npm: '--use-npm', pnpm: '--use-pnpm', yarn: '--use-yarn', bun: '--use-bun' }[pm];
  // App Router + TS + Tailwind v4, no src dir, non-interactive.
  return ['--ts', '--tailwind', '--app', '--eslint', '--no-src-dir', '--yes', use];
}

/**
 * The delegation command — pure, so a flag change is a one-line, unit-tested
 * edit. npm needs `--` to pass flags through to the created tool; yarn classic
 * dislikes the `@latest` tag.
 */
export function buildScaffoldCommand(
  framework: WebFramework,
  pm: PackageManager,
  name: string,
): { cmd: string; args: string[] } {
  const create = framework === 'next' ? 'next-app' : 'vite';
  const tool = pm === 'yarn' ? create : `${create}@latest`;
  // `--no-interactive` is critical: create-vite v7+ prompts "Install with <pm> and
  // start now?" whenever stdin is a TTY — even with `--template` — then installs and
  // launches the dev server itself, blocking us. The user Ctrl+C's the server, which
  // kills this whole process before any Veneer wiring runs, leaving a bare Vite app.
  // The flag (introduced alongside that prompt) forces non-interactive scaffold-only.
  const flags = framework === 'next' ? nextFlags(pm) : ['--template', 'react-ts', '--no-interactive'];
  const sep = pm === 'npm' ? ['--'] : [];
  return { cmd: pm, args: ['create', tool, name, ...sep, ...flags] };
}

/** The install args for a package manager (`npm install` vs `<pm> add`). */
export function installArgs(pm: PackageManager, pkgs: string[], dev = false): string[] {
  if (pm === 'npm') return ['install', ...(dev ? ['--save-dev'] : []), ...pkgs];
  const devFlag = dev ? (pm === 'bun' ? '-d' : '-D') : null;
  return ['add', ...(devFlag ? [devFlag] : []), ...pkgs];
}

/** A minimal, self-contained token-driven starter page — themeable on first run. */
export function starterPage(framework: WebFramework): string {
  const from = framework === 'next' ? '@/components' : './components';
  const fn = framework === 'next' ? 'Home' : 'App';
  return `import { ThemeSwitcher } from '${from}/ThemeSwitcher'

export default function ${fn}() {
  return (
    <div className="min-h-screen bg-surface text-text">
      <header className="flex items-center justify-between gap-4 border-border bg-surface-raised px-6 py-4 [border-width:var(--border-width-default)]">
        <h1 className="font-display text-xl font-bold">My Veneer app</h1>
        <ThemeSwitcher />
      </header>
      <main className="mx-auto max-w-3xl p-6">
        <article className="rounded-lg border-border bg-surface-raised p-6 [border-width:var(--border-width-default)] [box-shadow:var(--shadow-card)]">
          <h2 className="text-lg font-bold">Themeable by default</h2>
          <p className="mt-2 text-text-muted">
            Every value here comes from a theme token. Switch the theme above and watch
            color, type, radius, border, and shadow change together — no re-render.
          </p>
          <div className="mt-4 flex gap-3">
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-on-primary hover:bg-primary-hover">Primary</button>
            <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-on-primary hover:bg-accent-hover">Accent</button>
          </div>
        </article>
      </main>
    </div>
  )
}
`;
}

export interface ScaffoldOptions {
  /** Directory to create the app under (typically the user's cwd). */
  parentDir: string;
  /** App directory name (the positional arg). */
  name: string;
  framework: ScaffoldFramework;
  pm: PackageManager;
  /** Default true; `--no-install` skips dependency install. */
  install?: boolean;
  /** Run an agent hand-off after wiring (from `--agent[=…]`); null/undefined skips it. */
  agent?: AgentChoice | null;
  dryRun?: boolean;
  log?: (line: string) => void;
}

function run(cmd: string, args: string[], cwd: string): void {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`\`${cmd} ${args.join(' ')}\` failed (exit ${res.status ?? '?'})`);
}

/**
 * create-vite's `react-ts` template ships no Tailwind, so make the app a real
 * React + Tailwind v4 app — exactly what `runInit` then expects. The template's
 * demo `index.css` fights a real layout, so replace it with just the Tailwind
 * import (init adds the Veneer token import right after).
 */
function setUpViteTailwind(appDir: string, log: (l: string) => void): void {
  const det = detect(appDir);
  writeFileSync(join(appDir, det.globalCssPath ?? 'src/index.css'), '@import "tailwindcss";\n');
  const vcRel = det.viteConfigPath ?? 'vite.config.ts';
  const vcAbs = join(appDir, vcRel);
  if (existsSync(vcAbs)) writeFileSync(vcAbs, addTailwindVite(readFileSync(vcAbs, 'utf8')).content);
  log('  ✓ Tailwind v4 set up (plugin + stylesheet)');
}

/** Overwrite the template's demo page with a token-driven starter (switcher + showcase). */
function writeStarterPage(appDir: string, framework: WebFramework, log: (l: string) => void): void {
  const det = detect(appDir);
  const rel =
    framework === 'next' ? join(dirname(det.entryPath ?? 'app/layout.tsx'), 'page.tsx') : 'src/App.tsx';
  const abs = join(appDir, rel);
  if (existsSync(abs)) {
    writeFileSync(abs, starterPage(framework));
    log(`  ✓ ${rel} — a token-driven starter page`);
  }
}

/** Scaffold + wire a fresh app. Returns the created app directory. */
export function runScaffold(opts: ScaffoldOptions): { appDir: string } {
  // Expo (React Native) takes a wholly separate native path — Veneer's web runtime
  // (DOM provider, anti-flash, tokens.css import) doesn't apply there.
  if (opts.framework === 'expo') return runScaffoldExpo(opts);

  const log = opts.log ?? console.log;
  const appDir = join(opts.parentDir, opts.name);
  const { cmd, args } = buildScaffoldCommand(opts.framework, opts.pm, opts.name);

  if (opts.dryRun) {
    log(`Would scaffold:  ${cmd} ${args.join(' ')}   (cwd: ${opts.parentDir})`);
    log('Then install Veneer + eslint-plugin-veneer and run the same `veneerui init` wiring');
    log('an existing app uses (tokens + <ThemeProvider> + anti-flash + the lint gate), add a');
    log('switcher, and drop a token-driven starter page.');
    if (opts.agent) log(`Then hand off to: ${opts.agent === 'auto' ? 'an installed agent' : opts.agent}.`);
    return { appDir };
  }

  log(`\nScaffolding ${opts.name} — ${opts.framework} + Tailwind v4 (${opts.pm})…`);
  run(cmd, args, opts.parentDir);

  // Vite ships no Tailwind; create-next-app already includes it.
  if (opts.framework === 'vite') setUpViteTailwind(appDir, log);

  if (opts.install !== false) {
    log('\nInstalling Veneer…');
    if (opts.framework === 'vite') run(opts.pm, installArgs(opts.pm, TAILWIND_PKGS, true), appDir);
    run(opts.pm, installArgs(opts.pm, [RUNTIME_PKG], false), appDir);
    // The lint gate (dev): eslint-plugin-veneer, enabled by runInit's wireEslint.
    run(opts.pm, installArgs(opts.pm, [ESLINT_PKG], true), appDir);
  }

  // Wire Veneer through the SAME engine `veneerui init` uses — tokens, provider,
  // anti-flash, the agent guide, and (only if a patch bails) VENEER-SETUP.md.
  log('\nWiring Veneer…');
  runInit({ root: appDir, log });

  // Copy the switcher (+ its panels), then a token-driven starter page that uses it.
  runAdd(STARTER_COMPONENTS, { root: appDir, log: () => {} });
  log('  ✓ added a ThemeSwitcher');
  writeStarterPage(appDir, opts.framework, log);

  if (opts.agent) {
    const noGit = !existsSync(join(appDir, '.git'));
    runAgentHandoff({ root: appDir, agent: opts.agent, noGit, log });
  }

  return { appDir };
}
