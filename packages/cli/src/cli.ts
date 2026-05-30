/**
 * `veneerui` CLI entry. Tiny hand-rolled arg parser (zero deps): the first token
 * is the command, the rest are positionals and flags. Dispatches to init / add /
 * list. Every action is documented so the manual path always exists.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInit } from './init';
import { runAdd } from './add';
import { runList } from './list';
import { runDoctor } from './doctor';
import { runMigrate } from './migrate';
import { runFonts } from './fonts';

interface Parsed {
  command?: string;
  positionals: string[];
  root: string;
  dryRun: boolean;
  force: boolean;
  dir?: string;
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
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--dry-run') p.dryRun = true;
    else if (a === '--force' || a === '-f') p.force = true;
    else if (a === '--help' || a === '-h') p.help = true;
    else if (a === '--version' || a === '-v') p.version = true;
    else if (a === '--dir') p.dir = rest[++i];
    else if (a.startsWith('--dir=')) p.dir = a.slice('--dir='.length);
    else if (a === '--cwd') p.root = resolve(rest[++i]);
    else if (a.startsWith('--cwd=')) p.root = resolve(a.slice('--cwd='.length));
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

const HELP = `veneerui — add Veneer theming to an existing Vite or Next + Tailwind v4 app

Usage:
  veneerui init [--dry-run] [--cwd <path>]      Wire Veneer into this project
  veneerui add <component…> [--force] [--dir d] Copy UI components into your project
  veneerui add fonts                            Print install + imports for the built-in themes' fonts
  veneerui doctor [--cwd <path>]                Report how much of your UI is themeable today
  veneerui migrate [--dry-run] [--cwd <path>]   Rewrite the mechanical gotchas to themeable tokens
  veneerui list                                 List available components
  veneerui --version | --help

Examples:
  npx veneerui init
  npx veneerui add switcher
  npx veneerui add switcher banner --dir src/ui
  npx veneerui add fonts
  npx veneerui doctor
  npx veneerui migrate --dry-run

Every change init makes is also documented in docs/integration-{vite,next}.md,
so you can always do it by hand.`;

function main(): void {
  const p = parse(process.argv.slice(2));

  if (p.version) {
    console.log(version());
    return;
  }
  if (!p.command || p.command === 'help' || p.help) {
    console.log(HELP);
    return;
  }

  switch (p.command) {
    case 'init':
      runInit({ root: p.root, dryRun: p.dryRun });
      break;
    case 'add':
      // `add fonts` is a distinct flow (install packages + import lines), not a
      // component copy — route it before the registry resolver.
      if (p.positionals[0] === 'fonts') runFonts({ root: p.root });
      else runAdd(p.positionals, { root: p.root, dir: p.dir, force: p.force, dryRun: p.dryRun });
      break;
    case 'doctor':
      runDoctor({ root: p.root });
      break;
    case 'migrate':
      runMigrate({ root: p.root, dryRun: p.dryRun });
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
