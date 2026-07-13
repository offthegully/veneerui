/**
 * Upstream-drift smoke test: scaffold one framework with the locally built
 * `create-veneerui` against the LIVE upstream `create-*` tools, then assert the
 * wiring contract that template reshapes silently break (create-vite v8 swapped
 * ESLint for oxlint and killed the lint gate; Expo SDK 56 broke NativeWind
 * bundling). Run by `.github/workflows/upstream-smoke.yml` on a schedule, and by
 * hand whenever you touch setup/scaffold code:
 *
 *   npm run build:create && npx tsx scripts/smoke-scaffold.ts <vite|next|react-router|expo>
 *
 * Asserts, per web framework: scaffold exits 0 → no VENEER-SETUP.md remains →
 * the token @import / provider / anti-flash actually landed (grep, not trust) →
 * `npm run lint` is green on the starter → the veneer/* gate FIRES on an
 * injected `bg-blue-500` (a green lint with no gate — the oxlint incident —
 * must fail here) → production build passes. For Expo: the token codegen ran,
 * typecheck passes, and `expo export` bundles (where the SDK drift surfaces).
 *
 * Scaffolds into a temp dir OUTSIDE the repo so `@offthegully/veneerui` resolves
 * from the npm registry, exactly as it does for users. Pass --keep to retain the
 * app on success; on failure it is always kept and its path printed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getProfile } from '../packages/setup-core/src/profiles.ts';

const FRAMEWORKS = ['vite', 'next', 'react-router', 'expo'] as const;
type Fw = (typeof FRAMEWORKS)[number];

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const CREATE_DIST = join(repoRoot, 'packages/create-veneerui/dist/index.js');

const fw = process.argv[2] as Fw | undefined;
const keep = process.argv.includes('--keep');
if (!fw || !FRAMEWORKS.includes(fw)) {
  console.error(`Usage: tsx scripts/smoke-scaffold.ts <${FRAMEWORKS.join('|')}> [--keep]`);
  process.exit(1);
}
if (!existsSync(CREATE_DIST)) {
  console.error('packages/create-veneerui/dist is missing — run `npm run build:create` first.');
  process.exit(1);
}

let failed = false;
function check(cond: boolean, name: string): void {
  console.log(`${cond ? '  ✓' : '  ✗ FAIL:'} ${name}`);
  if (!cond) failed = true;
}

/** Run a command that must succeed (stdio inherited so upstream output is visible). */
function run(cmd: string, args: string[], cwd: string): void {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: SPAWN_ENV });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`\`${cmd} ${args.join(' ')}\` exited ${res.status ?? '?'}`);
}

/** Run a command whose output we assert on (combined stdout+stderr). */
function runCapture(cmd: string, args: string[], cwd: string): { status: number; output: string } {
  const res = spawnSync(cmd, args, { cwd, encoding: 'utf8', env: SPAWN_ENV });
  return { status: res.status ?? -1, output: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

// CI=1 keeps upstream tools non-interactive; kill Expo's telemetry chatter.
const SPAWN_ENV = { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' };

const read = (app: string, rel: string): string =>
  existsSync(join(app, rel)) ? readFileSync(join(app, rel), 'utf8') : '';
const firstExisting = (app: string, rels: string[]): string | undefined =>
  rels.find((r) => existsSync(join(app, r)));

function smokeWeb(app: string): void {
  const profile = getProfile(fw!);
  if (!profile?.scaffold) throw new Error(`no scaffold profile for ${fw}`);

  console.log('\n— wiring contract —');
  check(!existsSync(join(app, 'VENEER-SETUP.md')), 'no VENEER-SETUP.md remains (fully wired)');

  const cssRel = firstExisting(app, profile.cssCandidates);
  check(
    !!cssRel && read(app, cssRel).includes('@offthegully/veneerui/tokens.css'),
    `token @import in ${cssRel ?? profile.cssCandidates[0]}`,
  );

  const entryRel = firstExisting(app, profile.entryCandidates);
  const entry = entryRel ? read(app, entryRel) : '';
  if (profile.wiring === 'vite-spa') {
    check(entry.includes('ThemeProvider'), `<ThemeProvider> wrap in ${entryRel}`);
    const vc = firstExisting(app, ['vite.config.ts', 'vite.config.js']);
    check(
      !!vc && read(app, vc).includes('@offthegully/veneerui/vite'),
      `veneer() anti-flash plugin in ${vc ?? 'vite.config.ts'}`,
    );
  } else if (profile.wiring === 'next-app') {
    check(
      entry.includes('AntiFlashScript') && entry.includes('<Providers>'),
      `anti-flash + providers wired in ${entryRel}`,
    );
    const providers = entryRel ? read(app, join(dirname(entryRel), 'providers.tsx')) : '';
    check(providers.includes('ThemeProvider'), '<ThemeProvider> in providers.tsx');
  } else {
    check(
      entry.includes('ThemeProvider') && entry.includes('getAntiFlashScript'),
      `provider + anti-flash wired in ${entryRel}`,
    );
  }

  console.log('\n— lint gate —');
  run('npm', ['run', 'lint'], app); // green on the untouched starter

  // The two-sided assertion: a green lint with NO gate (the create-vite v8/oxlint
  // incident) passes the line above — so prove the gate fires on a violation.
  const starterRel = profile.scaffold.starter.file;
  const starterAbs = join(app, starterRel);
  const pristine = readFileSync(starterAbs, 'utf8');
  if (!pristine.includes('bg-primary')) throw new Error(`${starterRel} has no bg-primary to mutate`);
  writeFileSync(starterAbs, pristine.replace('bg-primary', 'bg-blue-500'));
  const lint = runCapture('npm', ['run', 'lint'], app);
  writeFileSync(starterAbs, pristine);
  check(lint.status !== 0, 'lint fails on an injected bg-blue-500');
  check(
    lint.output.includes('veneer/no-hardcoded-colors'),
    'the failure is veneer/no-hardcoded-colors (the gate, not another linter)',
  );

  console.log('\n— build —');
  run('npm', ['run', 'build'], app);
}

function smokeExpo(app: string): void {
  console.log('\n— wiring contract —');
  check(
    read(app, 'global.css').includes('tailwindcss/theme.css'),
    'gen:tokens ran (global.css with layered Tailwind imports)',
  );
  check(existsSync(join(app, 'src/veneer-themes.generated.ts')), 'token maps generated');

  console.log('\n— typecheck + bundle —');
  run('npm', ['run', 'typecheck'], app);
  // The SDK/NativeWind drift surfaces at Metro bundle time (SDK 56: "Chunk
  // containing module not found: …react-native-css…") — export exercises exactly
  // that, headless, no simulator needed.
  run('npx', ['expo', 'export', '--platform', 'ios'], app);
}

const parent = mkdtempSync(join(tmpdir(), 'veneer-smoke-'));
const app = join(parent, 'app');
console.log(`Smoke: ${fw} → ${app}\n`);

try {
  run('node', [CREATE_DIST, 'app', '--framework', fw], parent);
  if (fw === 'expo') smokeExpo(app);
  else smokeWeb(app);
} catch (err) {
  console.error(`\n✗ ${err instanceof Error ? err.message : String(err)}`);
  failed = true;
}

if (failed) {
  console.error(`\n✗ ${fw} smoke FAILED — app kept for inspection: ${app}`);
  process.exit(1);
}
if (keep) console.log(`\n✓ ${fw} smoke passed — app kept: ${app}`);
else {
  rmSync(parent, { recursive: true, force: true });
  console.log(`\n✓ ${fw} smoke passed`);
}
