/**
 * `veneerui migrate` — the mechanical 80% of a token migration.
 *
 * The AGENTS.md gotcha table is, in effect, a codemod spec: a set of 1:1
 * rewrites from "looks right but bakes at build time" utilities to their
 * themeable forms (`shadow-md` → `[box-shadow:var(--shadow-md)]`, `border` →
 * `[border-width:var(--border-width-default)] border-border`, `duration-200` →
 * the calc form). This applies all of those deterministically.
 *
 * It deliberately does NOT touch the judgment calls — which palette maps to
 * `bg-primary` vs `bg-accent`, whether a surface is raised or sunken, which
 * scale step an arbitrary size rounds to. Those it FLAGS with a file:line so a
 * human finishes them; it never guesses a color.
 *
 * `migrate(text)` is pure (the codemod); `runMigrate` does the fs walk + writes.
 * Both reuse `@veneerui/lint-core/conversions`, the same table `doctor` counts
 * and the eslint plugin guards — one spec, three tools.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { migrateSource, findSourceConversions, classRegions } from '@veneerui/lint-core/conversions';
import { findClassColorViolations } from '@veneerui/lint-core/detect';
import { collectFiles, isSourceCode } from './walk';

export interface MigrateFlag {
  kind: string;
  value: string;
  line: number;
  suggest: string;
}
export interface MigrateResult {
  output: string;
  changed: boolean;
  applied: { kind: string; from: string }[];
  flags: MigrateFlag[];
}

/** 1-based line number of a character offset in `text`. */
function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}

/**
 * Pure codemod over one file's source. Everything is scoped to `className`/
 * `class` attribute values (via lint-core), so a utility-looking token in prose,
 * a comment, or a token-name array is never rewritten or flagged. Applies the
 * deterministic conversions and collects the judgment calls (structural ones
 * plus hardcoded colors) as flags — never rewriting a color, which is a human
 * decision.
 */
export function migrate(text: string): MigrateResult {
  const { output, applied } = migrateSource(text);

  const flags: MigrateFlag[] = [];
  // Judgment-call structural gotchas (opacity, arbitrary sizes) — already scoped.
  for (const j of findSourceConversions(text)) {
    if (j.deterministic === false) {
      flags.push({ kind: j.kind, value: j.value, line: lineAt(text, j.index), suggest: j.suggest ?? '' });
    }
  }
  // Hardcoded colors are the biggest judgment call of all — flag, never guess.
  // Scoped to class regions too, so a hex in a comment/schema isn't flagged.
  for (const r of classRegions(text)) {
    for (const c of findClassColorViolations(text.slice(r.start, r.end))) {
      flags.push({
        kind: c.kind,
        value: c.value,
        line: lineAt(text, c.index + r.start),
        suggest: 'a semantic color utility (bg-primary, text-text-muted, …) — your choice',
      });
    }
  }

  return { output, changed: output !== text, applied, flags };
}

export interface MigrateOptions {
  root: string;
  dryRun?: boolean;
  log?: (line: string) => void;
}

export function runMigrate(opts: MigrateOptions): void {
  const log = opts.log ?? console.log;
  // Prefer the app source dir; migrate only rewrites code (CSS is left alone).
  const files = collectFiles(opts.root, opts.root, isSourceCode);

  let filesChanged = 0;
  let rewrites = 0;
  const allFlags: { path: string; flag: MigrateFlag }[] = [];

  for (const f of files) {
    const result = migrate(f.text);
    for (const flag of result.flags) allFlags.push({ path: f.path, flag });
    if (!result.changed) continue;
    filesChanged++;
    rewrites += result.applied.length;
    if (opts.dryRun) {
      log(`• would rewrite ${f.path} (${result.applied.length}): ${summarise(result.applied)}`);
    } else {
      writeFileSync(join(opts.root, f.path), result.output);
      log(`✓ ${f.path} (${result.applied.length}): ${summarise(result.applied)}`);
    }
  }

  const verb = opts.dryRun ? 'would rewrite' : 'rewrote';
  log(`\n${verb} ${rewrites} utility(ies) across ${filesChanged} file(s).`);

  if (allFlags.length) {
    log(`\n${allFlags.length} thing(s) need a human (not auto-changed):`);
    for (const { path, flag } of allFlags) {
      log(`  ${path}:${flag.line}  ${flag.value} → ${flag.suggest}`);
    }
  }
  if (opts.dryRun) log('\nThis was a dry run — re-run without --dry-run to write the changes.');
}

/** "3× box-shadow, 1× border-width" style summary of applied rewrites. */
function summarise(applied: { kind: string }[]): string {
  const counts: Record<string, number> = {};
  for (const a of applied) counts[a.kind] = (counts[a.kind] ?? 0) + 1;
  return Object.entries(counts)
    .map(([kind, n]) => `${n}× ${kind}`)
    .join(', ');
}
