/**
 * `veneerui` CLI entry. Tiny hand-rolled arg parser (zero deps): the first token
 * is the command, the rest are positionals and flags. Dispatches to init / add /
 * list. Every action is documented so the manual path always exists.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInit, runAdd, runFonts, isPackageManager, FRAMEWORK_PROFILES, type PackageManager } from '@veneerui/setup-core';
import { runList } from './list';

interface Parsed {
  command?: string;
  positionals: string[];
  root: string;
  dryRun: boolean;
  force: boolean;
  dir?: string;
  /** Override the package manager init/add/fonts print install commands for. */
  pm?: PackageManager;
  help: boolean;
  version: boolean;
}

function parse(argv: string[]): Parsed {
  const [command, ...rest] = argv;
  const p: Parsed = {
    command,
    positionals: [],
    root: process.cwd(),
    dryRun: false,
    force: false,
    help: false,
    version: false,
  };
  // A value-taking flag with no value gets a real error, not a raw Node TypeError
  // (`--cwd` used to crash with "path must be of type string").
  const value = (flag: string, v: string | undefined): string => {
    if (v === undefined || v.startsWith('-')) throw new Error(`${flag} requires a value`);
    return v;
  };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--dry-run') p.dryRun = true;
    else if (a === '--force' || a === '-f') p.force = true;
    else if (a === '--help' || a === '-h') p.help = true;
    else if (a === '--version' || a === '-v') p.version = true;
    else if (a === '--dir') p.dir = value(a, rest[++i]);
    else if (a.startsWith('--dir=')) p.dir = a.slice('--dir='.length);
    else if (a === '--cwd') p.root = resolve(value(a, rest[++i]));
    else if (a.startsWith('--cwd=')) p.root = resolve(a.slice('--cwd='.length));
    // `--pm` overrides the detected package manager the instructions use; an
    // unrecognized value keeps detection but says so (a typo shouldn't be silent).
    else if (a === '--pm' || a.startsWith('--pm=')) {
      const v = a === '--pm' ? value(a, rest[++i]) : a.slice('--pm='.length);
      if (isPackageManager(v)) p.pm = v;
      else console.error(`! unknown --pm "${v}" — using the detected package manager`);
    }
    // Anything else dash-prefixed is a typo'd flag; dropping it silently turns
    // e.g. `init --frce` into a quiet no-op.
    else if (a.startsWith('-')) throw new Error(`unknown flag "${a}" (run \`veneerui --help\`)`);
    else p.positionals.push(a);
  }
  return p;
}

function version(): string {
  try {
    const pkg = readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8');
    return (JSON.parse(pkg) as { version: string }).version;
  } catch {
    return '0.0.0';
  }
}

const HELP = `veneerui — add Veneer theming to an existing React + Tailwind v4 app

New app? Run \`npm create veneerui@latest\` instead — it scaffolds and wires everything.

Usage:
  veneerui init [--dry-run] [--cwd <path>]      Wire Veneer into this project
  veneerui add <component…> [--force] [--dir d] [--dry-run]
                                                Copy UI components into your project
  veneerui add fonts                            Print install + imports for the built-in themes' fonts
  veneerui list                                 List available components
  veneerui --version | --help

\`init\` auto-wires: ${FRAMEWORK_PROFILES.map((p) => p.label).join(', ')}.
Anything else gets the agent guide + a manual checklist (VENEER-SETUP.md).

The package manager is detected from the packageManager field or your lockfile
(so install commands are printed as pnpm/yarn/bun where appropriate); pass
--pm <npm|pnpm|yarn|bun> to override it.

Examples:
  npx veneerui init
  pnpm dlx veneerui init --pm pnpm
  npx veneerui add switcher
  npx veneerui add switcher showcase --dir src/ui
  npx veneerui add fonts

Every change init makes is also documented in the integration guide —
https://github.com/offthegully/veneerui/blob/main/docs/integration.md — and the
remaining manual steps are written to VENEER-SETUP.md, so you can always finish
by hand (or have your AI agent do it).`;

function main(): void {
  const p = parse(process.argv.slice(2));

  if (p.version || p.command === '--version' || p.command === '-v') {
    console.log(version());
    return;
  }
  if (p.help || !p.command || p.command === 'help' || p.command === '--help' || p.command === '-h') {
    console.log(HELP);
    return;
  }

  switch (p.command) {
    case 'init':
      runInit({ root: p.root, dryRun: p.dryRun, pm: p.pm });
      break;
    case 'add':
      // `add fonts` is a distinct flow (install packages + import lines), not a
      // component copy — route it before the registry resolver. Mixing it with
      // component names used to silently drop whichever came second.
      if (p.positionals.includes('fonts') && p.positionals.length > 1) {
        throw new Error('`add fonts` is its own flow — run it separately from component adds');
      }
      if (p.positionals[0] === 'fonts') runFonts({ root: p.root, pm: p.pm });
      else runAdd(p.positionals, { root: p.root, dir: p.dir, force: p.force, dryRun: p.dryRun, pm: p.pm });
      break;
    case 'list':
      runList();
      break;
    default:
      console.error(`Unknown command "${p.command}".\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

try {
  main();
} catch (err) {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}
