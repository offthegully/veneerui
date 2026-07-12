/**
 * Package-manager vocabulary, shared by both setup surfaces (scaffold + init).
 *
 * Two distinct *detection* signals for two distinct entry points:
 *   - `resolvePm` reads `npm_config_user_agent` — correct for the **scaffolder**
 *     (`pnpm create veneerui` runs pnpm, so the agent string is authoritative).
 *   - `detectPm` reads the project's `packageManager` field / lockfile — correct
 *     for `veneerui init` on an **existing** app, where the CLI is usually launched
 *     via `npx` / `pnpm dlx` / `bunx` and the user-agent reflects the *runner*, not
 *     the repo's package manager.
 *
 * Two flavours of *command*: `installArgs` returns argv for spawning a real install
 * (the scaffolder runs it); the `*Hint` helpers return the command **as a string**
 * for the instruction text init/fonts/add/setup-plan print — they never install,
 * they tell you what to run, so the dialect has to match your package manager.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

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

// Checked in lockfile → PM. Order matters when a repo has stragglers (a pnpm repo
// that still has a leftover package-lock.json): the intentional managers win, npm
// is the last-resort default.
const LOCKFILES: ReadonlyArray<readonly [string, PackageManager]> = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['bun.lock', 'bun'], // Bun ≥1.2 text lockfile
  ['bun.lockb', 'bun'], // legacy binary lockfile
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
];

/**
 * Detect an existing project's package manager — the reliable signal for `init`.
 * Precedence: corepack's `packageManager` field (the most authoritative, an
 * explicit declaration) → a committed lockfile → npm as the default.
 */
export function detectPm(root: string): PackageManager {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      packageManager?: string;
    };
    const named = pkg.packageManager?.split('@')[0];
    if (isPackageManager(named)) return named;
  } catch {
    /* no / unreadable package.json — fall through to lockfiles */
  }
  for (const [file, pm] of LOCKFILES) {
    if (existsSync(join(root, file))) return pm;
  }
  return 'npm';
}

/** Argv for spawning an install (`npm install x` vs `<pm> add x`). */
export function installArgs(pm: PackageManager, pkgs: string[], dev = false): string[] {
  if (pm === 'npm') return ['install', ...(dev ? ['--save-dev'] : []), ...pkgs];
  const devFlag = dev ? (pm === 'bun' ? '-d' : '-D') : null;
  return ['add', ...(devFlag ? [devFlag] : []), ...pkgs];
}

/**
 * The install command as a *string*, for instruction text — `npm i` (the form
 * people type) rather than `npm install`, and `<pm> add` for everyone else.
 */
export function installHint(pm: PackageManager, pkgs: string[], dev = false): string {
  const list = pkgs.join(' ');
  if (pm === 'npm') return `npm i ${dev ? '-D ' : ''}${list}`;
  const devFlag = dev ? (pm === 'bun' ? '-d ' : '-D ') : '';
  return `${pm} add ${devFlag}${list}`;
}

/** Run a package.json script (`npm run dev` vs `pnpm dev` / `yarn dev` / `bun dev`). */
export function runHint(pm: PackageManager, script: string): string {
  return pm === 'npm' ? `npm run ${script}` : `${pm} ${script}`;
}

/** Run a package binary without installing it (`npx …` vs `pnpm dlx` / `yarn dlx` / `bunx`). */
export function execHint(pm: PackageManager, cmd: string): string {
  const runner = { npm: 'npx', pnpm: 'pnpm dlx', yarn: 'yarn dlx', bun: 'bunx' }[pm];
  return `${runner} ${cmd}`;
}
