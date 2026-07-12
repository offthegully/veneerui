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
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { detect } from './detect';
import { getProfile } from './profiles';
import {
  addTailwindVite,
  stripNextFont,
  stripNextFontCss,
  stripNextColorSystem,
  setNextTitle,
  stripReactRouterTemplateCss,
  stripReactRouterFontLinks,
} from './entry-patch';
import { runInit } from './init';
import { runAdd } from './add';
import { runAgentHandoff, type AgentChoice } from './agent';
import { SETUP_FILE } from './setup-plan';
import { runScaffoldExpo } from './scaffold-expo';
import { installArgs, type PackageManager } from './pm';

/** Frameworks wired through the shared web path (official scaffolder + runInit). */
export type WebFramework = 'vite' | 'next' | 'react-router';
/** Every framework `create-veneerui` can scaffold. `expo` takes a separate native path. */
export type ScaffoldFramework = WebFramework | 'expo';

/** The runtime the scaffolded app installs. Pin only the runtime; `add`/wiring is in-process. */
const RUNTIME_PKG = '@offthegully/veneerui';
const TAILWIND_PKGS = ['tailwindcss', '@tailwindcss/vite'];
// The veneer/* themeability lint rules, installed dev-only; runInit wires the preset.
const ESLINT_PKG = 'eslint-plugin-veneer';
// Just the switcher (it pulls in its own panels). The full ThemeShowcase stays in
// the playground/docs — a new app shouldn't ship a demo component to delete.
const STARTER_COMPONENTS = ['switcher'];

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
  const create =
    framework === 'next' ? 'next-app' : framework === 'react-router' ? 'react-router' : 'vite';
  const tool = pm === 'yarn' ? create : `${create}@latest`;
  // `--no-interactive` (Vite) is critical: create-vite v7+ prompts "Install with
  // <pm> and start now?" whenever stdin is a TTY — even with `--template` — then
  // installs and launches the dev server itself, blocking us. The user Ctrl+C's the
  // server, which kills this whole process before any Veneer wiring runs, leaving a
  // bare Vite app. The flag forces non-interactive scaffold-only.
  // React Router: `--yes` accepts defaults non-interactively; `--no-git-init` keeps
  // the scaffold inside our flow (we manage git). Its template installs deps itself.
  const flags =
    framework === 'next'
      ? nextFlags(pm)
      : framework === 'react-router'
        ? ['--yes', '--no-git-init']
        : ['--template', 'react-ts', '--no-interactive'];
  const sep = pm === 'npm' ? ['--'] : [];
  return { cmd: pm, args: ['create', tool, name, ...sep, ...flags] };
}

/** A minimal, self-contained token-driven starter page — themeable on first run. */
export function starterPage(framework: WebFramework): string {
  const profile = getProfile(framework);
  const from = profile?.scaffold?.starter.importFrom ?? './components';
  const fn = profile?.scaffold?.starter.fnName ?? 'App';
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
  // Next's page sits beside its (possibly src/) layout; the others use the profile's
  // fixed starter path (Vite `src/App.tsx`, React Router `app/routes/home.tsx`).
  const rel =
    framework === 'next'
      ? join(dirname(det.entryPath ?? 'app/layout.tsx'), 'page.tsx')
      : (getProfile(framework)?.scaffold?.starter.file ?? 'src/App.tsx');
  const abs = join(appDir, rel);
  if (existsSync(abs)) {
    writeFileSync(abs, starterPage(framework));
    log(`  ✓ ${rel} — a token-driven starter page`);
  }
}

/** Title-case an app dir name for the page `<title>` (`my-app` → `My App`). */
function titleFromName(name: string): string {
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() || name;
}

/**
 * Undo the create-next-app defaults that fight Veneer on a fresh Next app: the
 * `next/font` (Geist) pin — which overrides the `font-sans` token and silently
 * disables font theming, so body text won't follow a serif/mono theme — the
 * template's own color system in `globals.css` (`--background`/`--foreground`, the
 * `@theme inline` block, the `body { … }` rule, and the `prefers-color-scheme` flip),
 * which would pin the page surface independent of the chosen theme, and the leftover
 * "Create Next App" page title. Each patch is anchored and bails quietly on an
 * unfamiliar shape, so an upstream template reshape just leaves the file as-is.
 */
function normalizeNextScaffold(appDir: string, name: string, log: (l: string) => void): void {
  const det = detect(appDir);
  const layoutRel = det.entryPath ?? 'app/layout.tsx';
  const layoutAbs = join(appDir, layoutRel);
  if (existsSync(layoutAbs)) {
    const noFont = stripNextFont(readFileSync(layoutAbs, 'utf8'));
    const titled = setNextTitle(noFont.content, titleFromName(name));
    if (noFont.changed || titled.changed) {
      writeFileSync(layoutAbs, titled.content);
      const bits = [
        noFont.changed && 'removed the next/font pin (font tokens now theme)',
        titled.changed && 'set the page title',
      ]
        .filter(Boolean)
        .join(' + ');
      log(`  ✓ ${bits} in ${layoutRel}`);
    }
  }
  if (det.globalCssPath) {
    const cssAbs = join(appDir, det.globalCssPath);
    if (existsSync(cssAbs)) {
      const noFont = stripNextFontCss(readFileSync(cssAbs, 'utf8'));
      const noColor = stripNextColorSystem(noFont.content);
      if (noFont.changed || noColor.changed) {
        writeFileSync(cssAbs, noColor.content);
        const bits = [noFont.changed && 'font', noColor.changed && 'color'].filter(Boolean);
        log(`  ✓ cleared the create-next-app ${bits.join(' + ')} override${bits.length > 1 ? 's' : ''} in ${det.globalCssPath}`);
      }
    }
  }
}

/**
 * Undo the create-react-router template defaults that fight Veneer: its
 * `app/app.css` pins the font token (`@theme { --font-sans: "Inter" }`) and the
 * page surface (`html, body { @apply bg-white dark:bg-gray-950 }`), and its
 * `app/root.tsx` hard-loads Inter via Google-Fonts `links`. Mirrors
 * `normalizeNextScaffold`; each patch is anchored and bails on an unfamiliar shape.
 */
function normalizeReactRouterScaffold(appDir: string, log: (l: string) => void): void {
  const det = detect(appDir);
  if (det.globalCssPath) {
    const cssAbs = join(appDir, det.globalCssPath);
    if (existsSync(cssAbs)) {
      const res = stripReactRouterTemplateCss(readFileSync(cssAbs, 'utf8'));
      if (res.changed) {
        writeFileSync(cssAbs, res.content);
        log(`  ✓ cleared the template font + surface overrides in ${det.globalCssPath}`);
      }
    }
  }
  const rootRel = det.entryPath ?? 'app/root.tsx';
  const rootAbs = join(appDir, rootRel);
  if (existsSync(rootAbs)) {
    const res = stripReactRouterFontLinks(readFileSync(rootAbs, 'utf8'));
    if (res.changed) {
      writeFileSync(rootAbs, res.content);
      log(`  ✓ removed the bundled Google-Fonts (Inter) links in ${rootRel} (font now themes)`);
    }
  }
  // Drop the template's `app/welcome` demo component: our starter page replaces the
  // route that imported it, so it's dead code — and it's full of hardcoded palette
  // colors (`text-gray-700`, `stroke-gray-600`) that would fail the gate on first lint.
  const welcomeAbs = join(appDir, 'app/welcome');
  if (existsSync(welcomeAbs)) {
    rmSync(welcomeAbs, { recursive: true, force: true });
    log('  ✓ removed the unused app/welcome demo (hardcoded colors that fail the gate)');
  }
}

/** A minimal ESLint flat config: parse TS/TSX and enforce only Veneer's gate. */
const REACT_ROUTER_ESLINT_CONFIG = `// create-react-router ships no ESLint, so this is the whole linter — kept minimal
// on purpose: a TS/TSX parser plus Veneer's themeability rules (veneer/*), and no
// opinionated style rules (so it never fails on the template's own code).
import tseslint from 'typescript-eslint';
import veneer from 'eslint-plugin-veneer';

export default [
  { ignores: ['build/', '.react-router/'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
  },
  veneer.configs.recommended,
];
`;

/**
 * Make the veneer/* themeability gate runnable on a fresh React Router app, which
 * ships no ESLint: write a minimal `eslint.config.js` (with the Veneer preset
 * already in it, so `init` reports it wired rather than leaving a setup step) and
 * add a `lint` script. Both are skipped if the user already has them. The
 * `eslint` + `typescript-eslint` deps come from the profile's `extraDevDeps`.
 */
function setUpReactRouterEslint(appDir: string, log: (l: string) => void): void {
  const cfgAbs = join(appDir, 'eslint.config.js');
  if (!existsSync(cfgAbs)) {
    writeFileSync(cfgAbs, REACT_ROUTER_ESLINT_CONFIG);
    log('  ✓ eslint.config.js — the veneer/* themeability gate (React Router ships no ESLint)');
  }
  const pkgAbs = join(appDir, 'package.json');
  if (existsSync(pkgAbs)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgAbs, 'utf8')) as { scripts?: Record<string, string> };
      pkg.scripts ??= {};
      if (!pkg.scripts.lint) {
        pkg.scripts.lint = 'eslint .';
        writeFileSync(pkgAbs, `${JSON.stringify(pkg, null, 2)}\n`);
        log('  ✓ added a `lint` script');
      }
    } catch {
      /* malformed package.json — leave it; init's setup plan will note the gate. */
    }
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

  // A template either ships Tailwind v4 (Next, React Router) or doesn't (create-vite's
  // react-ts). When it doesn't, we add it — and that install also pulls the rest of
  // the (uninstalled) template tree. When it does, the official scaffolder already
  // installed everything, so we only add Veneer on top.
  const scaffoldProfile = getProfile(opts.framework)?.scaffold;
  const bringsTailwind = scaffoldProfile?.bringsTailwind ?? false;
  if (!bringsTailwind) setUpViteTailwind(appDir, log);

  if (opts.install !== false) {
    log('\nInstalling Veneer…');
    if (!bringsTailwind) run(opts.pm, installArgs(opts.pm, TAILWIND_PKGS, true), appDir);
    run(opts.pm, installArgs(opts.pm, [RUNTIME_PKG], false), appDir);
    // The lint gate (dev): eslint-plugin-veneer, enabled by runInit's wireEslint.
    // Some templates ship no ESLint at all (React Router) — extraDevDeps supplies it.
    const eslintDeps = [ESLINT_PKG, ...(scaffoldProfile?.extraDevDeps ?? [])];
    run(opts.pm, installArgs(opts.pm, eslintDeps, true), appDir);
  }

  // For a template with no ESLint of its own (React Router), drop in a minimal flat
  // config + `lint` script BEFORE init, so init's wireEslint finds it and the gate is
  // active out of the box (no leftover VENEER-SETUP.md step).
  if (opts.framework === 'react-router') setUpReactRouterEslint(appDir, log);

  // Wire Veneer through the SAME engine `veneerui init` uses — tokens, provider,
  // anti-flash, the agent guide, and (only if a patch bails) VENEER-SETUP.md.
  log('\nWiring Veneer…');
  runInit({ root: appDir, log });

  // Copy the switcher (+ its panels), then a token-driven starter page that uses it.
  runAdd(STARTER_COMPONENTS, { root: appDir, log: () => {} });
  log('  ✓ added a ThemeSwitcher');
  writeStarterPage(appDir, opts.framework, log);

  // Undo the official template's Veneer-fighting defaults on a fresh app.
  if (opts.framework === 'next') normalizeNextScaffold(appDir, opts.name, log);
  else if (opts.framework === 'react-router') normalizeReactRouterScaffold(appDir, log);

  // Hand off to an agent only when init left manual steps in VENEER-SETUP.md. On a
  // fully-wired scaffold (the common Vite/Next case) that file is never written —
  // so a handoff would just spend an LLM session re-verifying deterministic wiring,
  // pointed at a file that doesn't exist. Skip it and say why.
  if (opts.agent) {
    if (existsSync(join(appDir, SETUP_FILE))) {
      const noGit = !existsSync(join(appDir, '.git'));
      runAgentHandoff({ root: appDir, agent: opts.agent, noGit, log });
    } else {
      log('\n✓ Veneer was fully wired automatically — no manual steps, so no agent handoff is needed.');
    }
  }

  return { appDir };
}
