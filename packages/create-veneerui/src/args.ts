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
}

export function parse(argv: string[]): Parsed {
  const p: Parsed = { yes: false, install: true, dryRun: false, help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') p.help = true;
    else if (a === '--version' || a === '-v') p.version = true;
    else if (a === '--yes' || a === '-y' || a === '--defaults') p.yes = true;
    else if (a === '--no-install') p.install = false;
    else if (a === '--dry-run') p.dryRun = true;
    else if (a === '--agent') p.agent = 'auto';
    else if (a.startsWith('--agent=')) p.agent = a.slice('--agent='.length) as AgentChoice;
    else if (a === '--framework') p.framework = argv[++i];
    else if (a.startsWith('--framework=')) p.framework = a.slice('--framework='.length);
    else if (a === '--pm') p.pm = argv[++i];
    else if (a.startsWith('--pm=')) p.pm = a.slice('--pm='.length);
    else if (!a.startsWith('-') && p.name === undefined) p.name = a;
  }
  return p;
}

/** A valid project directory name (also the npm package name). Returns an error string, or undefined if valid. */
export function validateName(v: string): string | undefined {
  if (!v || !v.trim()) return 'Please enter a project name.';
  if (!/^[A-Za-z0-9._-]+$/.test(v)) return 'Use letters, numbers, dots, dashes, or underscores only.';
  return undefined;
}
