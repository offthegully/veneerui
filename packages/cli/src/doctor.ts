/**
 * `veneerui doctor` — the reality-check `init` can't give you.
 *
 * After `init` wires Veneer in, the host app still won't re-skin until its own
 * styles move from hardcoded values to tokens. That migration is the real work,
 * and nothing tells an adopter how much of it is left. `doctor` answers it with
 * one number: it scans the project, counts the un-themed islands (hardcoded
 * colors, baked shadows, fixed widths, arbitrary sizes), and reports roughly
 * what share of the UI is themeable today.
 *
 * It also catches the most common adoption trap: a shadcn (or other) `@theme`
 * block that redefines a token name Veneer owns, silently shadowing it.
 *
 * The analysis (`analyze`) is pure over an in-memory file list so it's testable
 * without a filesystem; `runDoctor` does the fs walk + printing.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findClassColorViolations, findBareColorLiterals } from '@veneerui/lint-core/detect';
import { findConversions } from '@veneerui/lint-core/conversions';
import { RESERVED_TOKEN_NAMES } from '@veneerui/lint-core/reserved-tokens';
import { collectFiles, isSourceCode, type SourceFile } from './walk';

export type ScanFile = SourceFile;
export interface Island {
  kind: string;
  value: string;
  /** false for the structural gotchas migrate can rewrite automatically. */
  judgment: boolean;
}
export interface FileFinding {
  path: string;
  islands: Island[];
}
export interface Collision {
  path: string;
  token: string;
}
export interface DoctorReport {
  codeFilesScanned: number;
  cssFilesScanned: number;
  filesWithIslands: number;
  totalIslands: number;
  islandsByKind: Record<string, number>;
  /** Share of code files free of un-themed islands, 0–100. */
  percentThemeable: number;
  findings: FileFinding[];
  collisions: Collision[];
}

const RESERVED = new Set<string>(RESERVED_TOKEN_NAMES);

/** Strip `--` so a declared custom property compares against the bare token name. */
function bareName(prop: string): string {
  return prop.replace(/^--/, '');
}

/**
 * Find token names redefined inside a `@theme { … }` block — the shadcn
 * coexistence trap. Tailwind v4's `@theme` (and `@theme inline`) declares
 * `--name: value` pairs; any whose name Veneer owns silently shadows our token.
 */
export function findThemeCollisions(css: string): string[] {
  const out: string[] = [];
  const blockRe = /@theme\b[^{]*\{([^}]*)\}/g;
  let block: RegExpExecArray | null;
  while ((block = blockRe.exec(css)) !== null) {
    const declRe = /(--[a-z0-9-]+)\s*:/gi;
    let decl: RegExpExecArray | null;
    while ((decl = declRe.exec(block[1])) !== null) {
      const name = bareName(decl[1]);
      if (RESERVED.has(name)) out.push(name);
    }
  }
  return out;
}

/** Pure analysis over an in-memory file list. */
export function analyze(files: ScanFile[]): DoctorReport {
  const findings: FileFinding[] = [];
  const collisions: Collision[] = [];
  const islandsByKind: Record<string, number> = {};
  let codeFilesScanned = 0;
  let cssFilesScanned = 0;

  const bump = (kind: string) => {
    islandsByKind[kind] = (islandsByKind[kind] ?? 0) + 1;
  };

  for (const f of files) {
    if (f.path.endsWith('.css')) {
      cssFilesScanned++;
      for (const token of findThemeCollisions(f.text)) collisions.push({ path: f.path, token });
      continue;
    }
    codeFilesScanned++;
    const islands: Island[] = [];
    // Class-string color violations are safe to scan in any code file.
    for (const v of findClassColorViolations(f.text)) {
      islands.push({ kind: v.kind, value: v.value, judgment: true });
      bump(v.kind);
    }
    // Bare hex / color-fn literals only count as islands in rendered markup —
    // .ts files (schemas, fixtures) legitimately hold hex (matches conformance).
    if (f.path.endsWith('.tsx') || f.path.endsWith('.jsx')) {
      for (const v of findBareColorLiterals(f.text)) {
        islands.push({ kind: v.kind, value: v.value, judgment: true });
        bump(v.kind);
      }
    }
    // Structural gotchas (baked shadows, fixed widths, fixed durations, …).
    for (const v of findConversions(f.text)) {
      islands.push({ kind: v.kind, value: v.value, judgment: v.deterministic === false });
      bump(v.kind);
    }
    if (islands.length) findings.push({ path: f.path, islands });
  }

  const totalIslands = Object.values(islandsByKind).reduce((a, b) => a + b, 0);
  const filesWithIslands = findings.length;
  const percentThemeable =
    codeFilesScanned === 0
      ? 100
      : Math.round(100 * (1 - filesWithIslands / codeFilesScanned));

  return {
    codeFilesScanned,
    cssFilesScanned,
    filesWithIslands,
    totalIslands,
    islandsByKind,
    percentThemeable,
    findings,
    collisions,
  };
}

export interface DoctorOptions {
  root: string;
  log?: (line: string) => void;
}

export function runDoctor(opts: DoctorOptions): DoctorReport {
  const log = opts.log ?? console.log;
  // Prefer scanning the app source dir if present, else the whole project root.
  const srcDir = existsSync(join(opts.root, 'src')) ? join(opts.root, 'src') : opts.root;
  const files = collectFiles(opts.root, srcDir, (n) => isSourceCode(n) || n.endsWith('.css'));
  const report = analyze(files);

  log('Veneer doctor — how much of your UI is themeable today?\n');
  log(`  scanned ${report.codeFilesScanned} code file(s), ${report.cssFilesScanned} stylesheet(s)`);

  if (report.totalIslands === 0 && report.collisions.length === 0) {
    log('\n  ✓ No un-themed islands found — your UI is fully driven by tokens. 🎉');
    return report;
  }

  log(
    `\n  ~${report.percentThemeable}% themeable — ${report.filesWithIslands} of ` +
      `${report.codeFilesScanned} file(s) still hold ${report.totalIslands} un-themed island(s):`,
  );
  for (const [kind, n] of Object.entries(report.islandsByKind).sort((a, b) => b[1] - a[1])) {
    log(`     ${String(n).padStart(4)}  ${kind}`);
  }

  if (report.collisions.length) {
    log(`\n  ⚠ ${report.collisions.length} @theme token collision(s) — these silently shadow Veneer's tokens:`);
    for (const c of report.collisions) log(`     ${c.path}: --${c.token}`);
    log("     Rename or remove these declarations so Veneer's tokens win.");
  }

  log('\n  Next:');
  log('     • `npx veneerui migrate` rewrites the mechanical ones (shadows, widths, durations).');
  log('     • Add `eslint-plugin-veneer` to stop new islands from creeping back in.');
  log('     • Colors and surface choices need a human — see AGENTS.md for the token vocabulary.');
  return report;
}
