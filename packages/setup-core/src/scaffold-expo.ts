/**
 * Scaffold a fresh, Veneer-themed **Expo (React Native)** app — the engine behind
 * `npm create veneerui --framework expo`. Like the web path it delegates project
 * creation to the official scaffolder (`create-expo-app`), then wires Veneer: copies
 * the NativeWind + Tailwind v4 config, a token codegen, a ThemeProvider/ThemeSwitcher,
 * and a token-driven starter, installs the deps, and runs the codegen so the app boots
 * themed.
 *
 * Veneer's *web* runtime (DOM ThemeProvider, anti-flash, tokens.css import) doesn't
 * apply on native, so this is a separate path from `runScaffold` rather than a branch
 * inside the shared `runInit` wiring. The token DATA still comes from the same package:
 * the codegen reads `@offthegully/veneerui/themes` (TOKEN_SCHEMA + BUILTIN_THEMES).
 *
 * Pure pieces — the delegation command, the dependency sets, the package.json patch,
 * the template manifest — are unit-tested; `runScaffoldExpo` is the fs/process glue.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installArgs, type PackageManager, type ScaffoldOptions } from './scaffold';
import { runAgentHandoff } from './agent';

/** The runtime data slice the codegen reads from; dev-only (the app never imports it). */
const VENEER_PKG = '@offthegully/veneerui';

/** Native deps installed through `expo install` so versions match the SDK. */
export const EXPO_NATIVE_DEPS = [
  'nativewind',
  'react-native-css',
  'react-native-reanimated',
  'react-native-worklets',
  'react-native-safe-area-context',
];

/** Build/dev deps installed through the package manager (Tailwind toolchain + the codegen source). */
export const EXPO_DEV_DEPS = ['tailwindcss', '@tailwindcss/postcss', 'postcss', VENEER_PKG];

/** asset (in assets/expo/) → path written into the scaffolded app. */
export const EXPO_TEMPLATE_FILES: ReadonlyArray<{ asset: string; dest: string }> = [
  { asset: 'metro.config.js', dest: 'metro.config.js' },
  { asset: 'babel.config.js', dest: 'babel.config.js' },
  { asset: 'postcss.config.mjs', dest: 'postcss.config.mjs' },
  { asset: 'nativewind-env.d.ts', dest: 'nativewind-env.d.ts' },
  { asset: 'index.ts', dest: 'index.ts' },
  { asset: 'App.tsx', dest: 'App.tsx' },
  { asset: 'AGENTS.md', dest: 'AGENTS.md' },
  { asset: 'gen-veneer-tokens.mjs', dest: 'scripts/generate-veneer-tokens.mjs' },
  { asset: 'veneer-themes.ts', dest: 'src/veneer-themes.ts' },
  { asset: 'ThemeProvider.tsx', dest: 'src/ThemeProvider.tsx' },
  { asset: 'ThemeSwitcher.tsx', dest: 'src/ThemeSwitcher.tsx' },
];

/** Resolves both from the bundled dist/index.js and from src during tests. */
const EXPO_ASSET_DIR = fileURLToPath(new URL('../assets/expo/', import.meta.url));

/**
 * The delegation command — pure, so a flag change is a one-line, unit-tested edit.
 * npm needs `--` to pass flags through; yarn classic dislikes the `@latest` tag.
 * `--no-install` is added when we'll skip dependency install.
 */
export function buildExpoScaffoldCommand(
  pm: PackageManager,
  name: string,
  install = true,
): { cmd: string; args: string[] } {
  const tool = pm === 'yarn' ? 'expo-app' : 'expo-app@latest';
  const sep = pm === 'npm' ? ['--'] : [];
  const flags = ['--template', 'blank-typescript', ...(install ? [] : ['--no-install'])];
  return { cmd: pm, args: ['create', tool, name, ...sep, ...flags] };
}

interface ExpoPackageJson {
  main?: string;
  scripts?: Record<string, string>;
  overrides?: Record<string, string>;
  [k: string]: unknown;
}

/**
 * Patch the created app's package.json: a stable entry, the codegen + typecheck
 * scripts, and the `lightningcss` pin (a known NativeWind-v5-preview build gotcha).
 * Pure so it's unit-tested. The override is npm-style; pnpm/yarn users may need to
 * mirror it under `pnpm.overrides` / `resolutions`.
 */
export function patchExpoPackageJson(pkg: ExpoPackageJson): ExpoPackageJson {
  return {
    ...pkg,
    main: 'index.ts',
    scripts: {
      ...pkg.scripts,
      'gen:tokens': 'node scripts/generate-veneer-tokens.mjs',
      typecheck: 'tsc --noEmit',
    },
    overrides: { ...pkg.overrides, lightningcss: '1.30.1' },
  };
}

function run(cmd: string, args: string[], cwd: string): void {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`\`${cmd} ${args.join(' ')}\` failed (exit ${res.status ?? '?'})`);
}

/** Copy the Veneer Expo templates into the app (creating parent dirs). */
function writeTemplates(appDir: string, log: (l: string) => void): void {
  for (const { asset, dest } of EXPO_TEMPLATE_FILES) {
    const to = join(appDir, dest);
    mkdirSync(dirname(to), { recursive: true });
    cpSync(join(EXPO_ASSET_DIR, asset), to);
  }
  log(`  ✓ wired NativeWind + Tailwind config, token codegen, ThemeProvider + switcher`);
}

function patchPackageJson(appDir: string, log: (l: string) => void): void {
  const p = join(appDir, 'package.json');
  const pkg = JSON.parse(readFileSync(p, 'utf8')) as ExpoPackageJson;
  writeFileSync(p, JSON.stringify(patchExpoPackageJson(pkg), null, 2) + '\n');
  log('  ✓ package.json — gen:tokens script + lightningcss pin');
}

/** Scaffold + wire a fresh Expo app. Returns the created app directory. */
export function runScaffoldExpo(opts: ScaffoldOptions): { appDir: string } {
  const log = opts.log ?? console.log;
  const appDir = join(opts.parentDir, opts.name);
  const install = opts.install !== false;
  const { cmd, args } = buildExpoScaffoldCommand(opts.pm, opts.name, install);

  if (opts.dryRun) {
    log(`Would scaffold:  ${cmd} ${args.join(' ')}   (cwd: ${opts.parentDir})`);
    log('Then copy the Veneer Expo templates (NativeWind + Tailwind config, token codegen,');
    log('ThemeProvider + ThemeSwitcher, a token-driven App), patch package.json,');
    if (install) {
      log(`install deps (expo install ${EXPO_NATIVE_DEPS.join(' ')}; ${opts.pm} add -D ${EXPO_DEV_DEPS.join(' ')}),`);
      log('and run `npm run gen:tokens` to generate global.css + the token maps.');
    } else {
      log('and skip install (run `npm install && npm run gen:tokens` yourself).');
    }
    if (opts.agent) log(`Then hand off to: ${opts.agent === 'auto' ? 'an installed agent' : opts.agent}.`);
    return { appDir };
  }

  log(`\nScaffolding ${opts.name} — Expo + NativeWind + Tailwind v4 (${opts.pm})…`);
  run(cmd, args, opts.parentDir);

  log('\nWiring Veneer…');
  writeTemplates(appDir, log);
  patchPackageJson(appDir, log);

  if (install) {
    log('\nInstalling deps…');
    run('npx', ['expo', 'install', ...EXPO_NATIVE_DEPS], appDir);
    run(opts.pm, installArgs(opts.pm, EXPO_DEV_DEPS, true), appDir);
    log('\nGenerating token data from Veneer…');
    run('node', ['scripts/generate-veneer-tokens.mjs'], appDir);
    log('  ✓ global.css + src/veneer-themes.generated.ts');
  } else {
    log('  (skipped install — run `npm install && npm run gen:tokens` before starting)');
  }

  if (opts.agent) {
    const noGit = true; // create-expo-app may or may not init git; treat as fresh for the hand-off note
    runAgentHandoff({ root: appDir, agent: opts.agent, noGit, log });
  }

  return { appDir };
}
