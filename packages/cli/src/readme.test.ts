/**
 * Drift guard for this package's README — the npm landing page for `veneerui`.
 *
 * Package READMEs are the layer that goes stale: hand-maintained copies of facts
 * whose source of truth lives in code. It already happened here: `init` gained
 * React Router 7 and TanStack Start while the README still said "Vite/Next", and
 * the built-in help's example advertised `veneerui add banner` — a component that
 * doesn't exist. These assertions pin the README (and the `--help` text, checked
 * as source since cli.ts runs main() on import) to the framework registry and the
 * component manifest, so that drift fails CI instead of shipping.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FRAMEWORK_PROFILES, loadManifest } from '@veneerui/setup-core';

const readme = readFileSync(fileURLToPath(new URL('../README.md', import.meta.url)), 'utf8');
const cliSource = readFileSync(fileURLToPath(new URL('./cli.ts', import.meta.url)), 'utf8');

/**
 * Component names used in `veneerui add …` examples. `fonts` is the built-in
 * fonts flow, not a registry component; flags and placeholders don't match the
 * leading-lowercase word pattern.
 */
function addExampleComponents(text: string): string[] {
  const names: string[] = [];
  for (const m of text.matchAll(/veneerui add ((?:[a-z][a-z0-9-]*(?: |$))+)/gm)) {
    names.push(...m[1].trim().split(/\s+/));
  }
  return names.filter((n) => n !== 'fonts');
}

describe('cli README (npm landing page) vs the code', () => {
  it('names every framework init auto-wires', () => {
    // The prose says "Vite, Next.js (App Router), …" rather than the full label
    // "Vite + React", so require the label's leading name, not the exact string.
    for (const p of FRAMEWORK_PROFILES) {
      const name = p.label.split(' + ')[0];
      expect(readme, `README should mention "${name}" (profile: ${p.id})`).toContain(name);
    }
  });

  it('documents the package-manager override', () => {
    expect(readme).toContain('--pm <npm|pnpm|yarn|bun>');
  });

  it('add examples reference only components that exist in the registry', () => {
    const registry = new Set(loadManifest().map((c) => c.name));
    for (const name of addExampleComponents(readme)) {
      expect(registry, `README example uses unknown component "${name}"`).toContain(name);
    }
  });

  it("--help's add examples reference only components that exist in the registry", () => {
    const registry = new Set(loadManifest().map((c) => c.name));
    const examples = addExampleComponents(cliSource);
    // The help must have at least one concrete add example to guard.
    expect(examples.length).toBeGreaterThan(0);
    for (const name of examples) {
      expect(registry, `--help example uses unknown component "${name}"`).toContain(name);
    }
  });

  it("--help's framework list comes from the registry (not a hand-typed copy)", () => {
    // cli.ts builds the list with a template interpolation over FRAMEWORK_PROFILES;
    // if someone replaces it with prose, this fails and points here.
    expect(cliSource).toContain('FRAMEWORK_PROFILES.map((p) => p.label)');
  });
});
