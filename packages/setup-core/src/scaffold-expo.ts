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
import { type ScaffoldOptions } from './scaffold';
import { installArgs, runHint, type PackageManager } from './pm';

/** The runtime data slice the codegen reads from; dev-only (the app never imports it). */
const VENEER_PKG = '@offthegully/veneerui';

/** Native deps installed through `expo install` so versions match the SDK. */
export const EXPO_NATIVE_DEPS = [
  // NativeWind isn't in Expo's version map, so pin it (and its react-native-css peer) to an
  // EXACT version. A caret on a prerelease (`^5.0.0-preview.4`) still floats forward — to a
  // newer preview or the stable release — which is exactly the breaking drift the pin is
  // meant to prevent. Bump these deliberately (and re-verify) when NativeWind v5 ships stable.
  'nativewind@5.0.0-preview.4',
  'react-native-css@3.0.7',
  // SDK-managed — leave unpinned so `expo install` picks versions matching the Expo SDK.
  // babel-preset-expo: our babel.config.js loads it by bare name, but it's only a
  // *transitive* dep of `expo` and npm may nest it under expo/node_modules (not hoist
  // it), so Babel can't resolve it from the project root and Metro fails to construct
  // its transformer ("Cannot find module 'babel-preset-expo'"). Installing it as a
  // direct dep forces a resolvable, SDK-matched copy.
  'babel-preset-expo',
  'react-native-reanimated',
  'react-native-worklets',
  'react-native-safe-area-context',
];

/** Build/dev deps installed through the package manager (Tailwind toolchain + the codegen source). */
export const EXPO_DEV_DEPS = ['tailwindcss', '@tailwindcss/postcss', 'postcss', VENEER_PKG];

/**
 * The dev-dep install args. `@offthegully/veneerui` is the WEB runtime, installed dev-only
 * so the token codegen can read its theme DATA (`@offthegully/veneerui/themes`) — the native
 * app never renders it. It declares `react-dom`/`vite` as peers; npm auto-installs the
 * react-dom peer, pulling react-dom@latest whose `react@^19.x.y` peer outranks the older
 * react Expo pins, and npm then hard-fails ERESOLVE. Those web peers are irrelevant on
 * native, so npm gets `--legacy-peer-deps`. (pnpm/yarn/bun don't hard-enforce peers — no flag.)
 */
export function expoDevInstallArgs(pm: PackageManager): string[] {
  const args = installArgs(pm, EXPO_DEV_DEPS, true);
  return pm === 'npm' ? [...args, '--legacy-peer-deps'] : args;
}

/**
 * The exact commands that complete a skipped install — the SAME argvs the install
 * path spawns. Native deps must go through `expo install` (it resolves SDK-compatible
 * versions), so unlike the web path they can't be recorded in package.json; printing
 * the real commands is the only honest recovery. A bare `<pm> install` would leave
 * NativeWind/babel-preset-expo/the codegen source missing and `gen:tokens` crashing.
 * Pure so it's unit-tested.
 */
export function expoRecoveryCommands(pm: PackageManager): string[] {
  return [
    `npx expo install ${EXPO_NATIVE_DEPS.join(' ')}`,
    `${pm} ${expoDevInstallArgs(pm).join(' ')}`,
    runHint(pm, 'gen:tokens'),
  ];
}

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
 * The Expo SDK the Veneer Expo templates are validated against — PINNED, not `@latest`.
 * NativeWind v5-preview + react-native-css don't yet bundle on the newest SDK's Metro
 * (SDK 56 / RN 0.85 fails with `Chunk containing module not found: …react-native-css…`),
 * so the scaffold targets the last SDK they work on (SDK 55 / RN 0.83). Bump this — and
 * re-run the Expo smoke test end-to-end — when NativeWind v5 supports a newer RN.
 * See docs/publishing.md and docs/expo.md.
 */
export const EXPO_SDK_TEMPLATE = 'blank-typescript@sdk-55';

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
  // `--yes` is critical: create-expo-app prompts "Select an Expo SDK version" in a TTY
  // even with `--template`, which blocks (and EOF-cancels) non-interactive/agent runs.
  // `--yes` takes the default; the explicit `--template` (SDK-pinned) still overrides it.
  const flags = ['--yes', '--template', EXPO_SDK_TEMPLATE, ...(install ? [] : ['--no-install'])];
  return { cmd: pm, args: ['create', tool, name, ...sep, ...flags] };
}

interface ExpoPackageJson {
  main?: string;
  scripts?: Record<string, string>;
  overrides?: Record<string, string>;
  resolutions?: Record<string, string>;
  pnpm?: { overrides?: Record<string, string>; [k: string]: unknown };
  [k: string]: unknown;
}

/**
 * Patch the created app's package.json: a stable entry, the codegen + typecheck scripts,
 * and the `lightningcss` pin (a known NativeWind-v5-preview build gotcha). Pure so it's
 * unit-tested. The pin is written under the key the chosen package manager actually reads
 * (`overrides` for npm/bun, `pnpm.overrides`, `resolutions` for yarn) — otherwise a
 * non-npm scaffold would silently get an unpinned lightningcss.
 */
export function patchExpoPackageJson(pkg: ExpoPackageJson, pm: PackageManager): ExpoPackageJson {
  const next: ExpoPackageJson = {
    ...pkg,
    main: 'index.ts',
    scripts: {
      ...pkg.scripts,
      'gen:tokens': 'node scripts/generate-veneer-tokens.mjs',
      typecheck: 'tsc --noEmit',
    },
  };
  const PIN = { lightningcss: '1.30.1' };
  if (pm === 'pnpm') next.pnpm = { ...pkg.pnpm, overrides: { ...pkg.pnpm?.overrides, ...PIN } };
  else if (pm === 'yarn') next.resolutions = { ...pkg.resolutions, ...PIN };
  else next.overrides = { ...pkg.overrides, ...PIN }; // npm + bun
  return next;
}

function run(cmd: string, args: string[], cwd: string): void {
  // npm/pnpm/yarn/bun/npx are .cmd shims on Windows, which spawnSync only finds
  // through a shell. Every arg is a simple validated token, so no quoting hazard.
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
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

function patchPackageJson(appDir: string, pm: PackageManager, log: (l: string) => void): void {
  const p = join(appDir, 'package.json');
  const pkg = JSON.parse(readFileSync(p, 'utf8')) as ExpoPackageJson;
  writeFileSync(p, JSON.stringify(patchExpoPackageJson(pkg, pm), null, 2) + '\n');
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
      // Print the exact spawns (incl. --legacy-peer-deps on npm) — dry-run is what
      // a cautious user checks before trusting the tool, so it must not paraphrase.
      log(`install deps (npx expo install ${EXPO_NATIVE_DEPS.join(' ')};`);
      log(`${opts.pm} ${expoDevInstallArgs(opts.pm).join(' ')}),`);
      log(`and run \`${runHint(opts.pm, 'gen:tokens')}\` to generate global.css + the token maps.`);
    } else {
      // Same discipline with the install skipped — the recovery commands, verbatim.
      log('and skip install — finish later with:');
      for (const c of expoRecoveryCommands(opts.pm)) log(`  ${c}`);
    }
    if (opts.agent) log(`Then hand off to: ${opts.agent === 'auto' ? 'an installed agent' : opts.agent}.`);
    return { appDir };
  }

  log(`\nScaffolding ${opts.name} — Expo + NativeWind + Tailwind v4 (${opts.pm})…`);
  run(cmd, args, opts.parentDir);
  // The delegate prints its own "done / next steps" — preempt anyone following those.
  log('\n(↑ that was the template scaffolder — ignore its next steps; Veneer continues below)');

  log('\nWiring Veneer…');
  writeTemplates(appDir, log);
  patchPackageJson(appDir, opts.pm, log);

  if (install) {
    log('\nInstalling deps…');
    run('npx', ['expo', 'install', ...EXPO_NATIVE_DEPS], appDir);
    run(opts.pm, expoDevInstallArgs(opts.pm), appDir);
    log('\nGenerating token data from Veneer…');
    run('node', ['scripts/generate-veneer-tokens.mjs'], appDir);
    log('  ✓ global.css + src/veneer-themes.generated.ts');
  } else {
    // A bare `<pm> install` would NOT be enough here (see expoRecoveryCommands) —
    // print the exact commands the install path would have spawned.
    log('\n  (skipped install — the app can\'t start until you run:)');
    for (const c of expoRecoveryCommands(opts.pm)) log(`    ${c}`);
  }

  // Mirror the web path's handoff guard: the agent prompt drives the SETUP_FILE
  // checklist, and the Expo path never writes one — everything above is wired
  // deterministically. A handoff would point an agent at a file that doesn't exist,
  // so skip it and say why.
  if (opts.agent) {
    log('\n✓ Expo was fully wired deterministically — no manual steps, so no agent handoff is needed.');
  }

  return { appDir };
}
