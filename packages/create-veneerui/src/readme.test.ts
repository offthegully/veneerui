/**
 * Drift guard for this package's README — the npm landing page for the scaffolder.
 *
 * Package READMEs are the layer that goes stale: they're hand-maintained copies of
 * facts whose source of truth lives in code, and they don't get touched when a
 * feature lands. It already happened once: React Router support shipped while the
 * README still advertised `--framework <vite|next|expo>` and claimed flags without
 * `--` "fall back to Vite" (the recovery had long existed). These assertions pin
 * the README's framework list, flag vocabulary, and agent values to the registry
 * and parser they describe, so that class of drift fails CI instead of shipping.
 *
 * (The user-facing `--help` text lives in index.ts, which runs `main()` on import —
 * so it's checked as source text, same facts, not imported.)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FRAMEWORK_PROFILES } from '@veneerui/setup-core';
import { AGENT_VALUES, KNOWN_FLAGS } from './args';

const readme = readFileSync(fileURLToPath(new URL('../README.md', import.meta.url)), 'utf8');
const helpSource = readFileSync(fileURLToPath(new URL('./index.ts', import.meta.url)), 'utf8');

/** Everything `--framework` accepts: the registry's scaffoldable ids + the two non-web paths. */
const frameworkValues = [
  ...FRAMEWORK_PROFILES.filter((p) => p.scaffold).map((p) => p.id),
  'expo',
  'other',
];

/** The `x|y|z` inside a documented `--framework <…>`, or null. */
function documentedFrameworks(text: string): string[] | null {
  const m = text.match(/--framework <([^>]+)>/);
  return m ? m[1].split('|') : null;
}

describe('create-veneerui README (npm landing page) vs the code', () => {
  it('documents exactly the framework values the CLI accepts', () => {
    const documented = documentedFrameworks(readme);
    expect(documented, 'README must show a `--framework <…>` value list').not.toBeNull();
    expect(new Set(documented!)).toEqual(new Set(frameworkValues));
  });

  it('names every scaffoldable framework by its registry label', () => {
    for (const p of FRAMEWORK_PROFILES.filter((p) => p.scaffold)) {
      expect(readme, `README should mention "${p.label}" (profile: ${p.id})`).toContain(p.label);
    }
  });

  it('documents every user-facing flag the parser knows', () => {
    // --help/--version are CLI furniture; --defaults is the --yes alias.
    const skip = new Set(['--help', '--version', '--defaults']);
    for (const flag of KNOWN_FLAGS.filter((f) => !skip.has(f))) {
      expect(readme, `README should document ${flag}`).toContain(flag);
    }
  });

  it('mentions no flags the parser would reject', () => {
    // Scoped to the **Flags:** paragraph — prose elsewhere legitimately shows `--`
    // (the npm separator note) and non-flag dashes.
    const para = readme.split('**Flags:**')[1]?.split('\n\n')[0] ?? '';
    for (const flag of para.match(/--[a-z-]+/g) ?? []) {
      expect(KNOWN_FLAGS, `README documents unknown flag ${flag}`).toContain(flag);
    }
  });

  it('documents the exact --agent value set', () => {
    expect(readme).toContain(`--agent[=${AGENT_VALUES.join('|')}]`);
  });

  it("the built-in --help's framework list matches the registry too", () => {
    const documented = documentedFrameworks(helpSource);
    expect(documented, 'index.ts HELP must show a `--framework <…>` value list').not.toBeNull();
    expect(new Set(documented!)).toEqual(new Set(frameworkValues));
  });
});
