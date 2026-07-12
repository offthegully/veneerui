import { describe, expect, it } from 'vitest';
import { runFonts } from './fonts';
import { FONT_PACKAGES } from '@veneerui/lint-core/font-packages';

/** Capture the printed lines. `pm` is pinned so the install command is deterministic
 * (not dependent on whatever package manager the test host repo happens to use). */
function run(root = process.cwd()): string {
  const lines: string[] = [];
  runFonts({ root, pm: 'npm', log: (l) => lines.push(l) });
  return lines.join('\n');
}

describe('runFonts', () => {
  const out = run();

  it('prints a single npm install with every Fontsource package', () => {
    expect(out).toMatch(/npm i .*@fontsource/);
    for (const f of FONT_PACKAGES) expect(out).toContain(f.pkg);
  });

  it('prints the exact import specifiers', () => {
    for (const spec of FONT_PACKAGES.flatMap((f) => f.imports)) {
      expect(out).toContain(`import '${spec}'`);
    }
  });

  it('warns about the font-sans / framework-font footgun', () => {
    expect(out).toMatch(/font-sans/);
    expect(out).toMatch(/next\/font/);
  });

  it('only offers installable (Fontsource) fonts, not self-hosted faces', () => {
    // MS Sans Serif is self-hosted (no pkg) and must not appear as installable.
    expect(out).not.toContain('MS Sans Serif');
    expect(FONT_PACKAGES.every((f) => f.pkg.startsWith('@fontsource'))).toBe(true);
  });
});
