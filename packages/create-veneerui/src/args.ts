/**
 * Pure flag parsing + validation for the `create-veneerui` wizard. Kept separate
 * from `index.ts` (which runs `main()` on import) so it's unit-testable.
 */
import type { AgentChoice } from '@veneerui/setup-core';

export interface Parsed {
  name?: string;
  framework?: string;
  yes: boolean;
  install: boolean;
  agent?: AgentChoice;
  pm?: string;
  dryRun: boolean;
  help: boolean;
  version: boolean;
  /** The first parse/validation error (unknown flag, bad value); `main` cancels on it. */
  error?: string;
}

/** Every flag the wizard understands — the vocabulary for unknown-flag errors (and the README drift guard). */
export const KNOWN_FLAGS = [
  '--help',
  '--version',
  '--yes',
  '--defaults',
  '--no-install',
  '--dry-run',
  '--agent',
  '--framework',
  '--pm',
];

/** Plain Levenshtein distance — inputs are flag names, so O(n·m) is nothing. */
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row.push(Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
    }
    prev = row;
  }
  return prev[b.length];
}

/** An unknown `--flag` error, with a did-you-mean when it's a close misspelling. */
function unknownFlag(a: string): string {
  const flag = a.split('=')[0];
  const near = KNOWN_FLAGS.find((k) => editDistance(flag, k) <= 2);
  return near
    ? `Unknown option \`${flag}\` — did you mean \`${near}\`?`
    : `Unknown option \`${flag}\`. Valid flags: ${KNOWN_FLAGS.join(', ')}.`;
}

/** `--agent` takes a specific agent, `auto` (whatever's installed), or `none` (skip). */
export const AGENT_VALUES = ['claude', 'codex', 'auto', 'none'] as const;

export function validateAgent(v: string): string | undefined {
  if ((AGENT_VALUES as readonly string[]).includes(v)) return undefined;
  return `Unknown --agent value "${v}" — expected ${AGENT_VALUES.slice(0, -1).join(', ')}, or ${AGENT_VALUES.at(-1)}.`;
}

export function validatePm(v: string | undefined): string | undefined {
  if (v === undefined) return '--pm requires a value — npm, pnpm, yarn, or bun.';
  if (v === 'npm' || v === 'pnpm' || v === 'yarn' || v === 'bun') return undefined;
  return `Unknown --pm value "${v}" — expected npm, pnpm, yarn, or bun.`;
}

export function parse(argv: string[]): Parsed {
  const p: Parsed = { yes: false, install: true, dryRun: false, help: false, version: false };
  const fail = (msg: string): void => void (p.error ??= msg);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') p.help = true;
    else if (a === '--version' || a === '-v') p.version = true;
    else if (a === '--yes' || a === '-y' || a === '--defaults') p.yes = true;
    else if (a === '--no-install') p.install = false;
    else if (a === '--dry-run') p.dryRun = true;
    else if (a === '--agent') p.agent = 'auto';
    else if (a.startsWith('--agent=')) {
      // A blind cast here would fall through to launching an agent the user never
      // named (resolveAgent treats any unknown value like `auto`) — validate instead.
      const v = a.slice('--agent='.length);
      const err = validateAgent(v);
      if (err) fail(err);
      else if (v !== 'none') p.agent = v as AgentChoice; // `none` = explicitly skip
    } else if (a === '--framework') p.framework = argv[++i];
    else if (a.startsWith('--framework=')) p.framework = a.slice('--framework='.length);
    else if (a === '--pm' || a.startsWith('--pm=')) {
      // resolvePm silently ignores an unknown value (falling back to detection) —
      // an explicit flag that does nothing is worse than an error, so error.
      const v = a === '--pm' ? argv[++i] : a.slice('--pm='.length);
      const err = validatePm(v);
      if (err) fail(err);
      else p.pm = v;
    } else if (a.startsWith('-')) fail(unknownFlag(a));
    else if (p.name === undefined) p.name = a;
    // Later positionals are ignored on purpose: npm's swallowed space-form flags
    // (`--framework next` without `--`) detach their values as stray positionals,
    // which `recoverSwallowedFlags` in index.ts picks back up from argv.
  }
  return p;
}

/** A valid project directory name (also the npm package name). Returns an error string, or undefined if valid. */
export function validateName(v: string): string | undefined {
  if (!v || !v.trim()) return 'Please enter a project name.';
  // Lowercase only: create-next-app hard-fails on capitals mid-flow (after the
  // prompt), while Vite/Expo accept them — reject up front so no framework can.
  if (/[A-Z]/.test(v)) return `Use lowercase (create-next-app rejects capitals) — try "${v.toLowerCase()}".`;
  if (!/^[a-z0-9._-]+$/.test(v)) return 'Use letters, numbers, dots, dashes, or underscores only.';
  return undefined;
}
