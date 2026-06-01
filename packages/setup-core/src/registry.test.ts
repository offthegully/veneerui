import { describe, expect, it } from 'vitest';
import { loadManifest, readComponentSource, resolveWithDeps } from './registry';

describe('registry', () => {
  const components = loadManifest();

  it('ships the curated set of components', () => {
    expect(components.map((c) => c.name).sort()).toEqual([
      'banner',
      'gallery-panel',
      'import-panel',
      'showcase',
      'switcher',
    ]);
  });

  it('resolves the switcher together with its panel dependencies', () => {
    const names = resolveWithDeps(['switcher'], components).map((c) => c.name);
    expect(names).toContain('switcher');
    expect(names).toContain('import-panel');
    expect(names).toContain('gallery-panel');
  });

  it('throws on an unknown component', () => {
    expect(() => resolveWithDeps(['nope'], components)).toThrow(/unknown/);
  });

  it('copy-in sources import their logic from @offthegully/veneerui, not relative runtime', () => {
    const switcher = readComponentSource('ThemeSwitcher.tsx');
    expect(switcher).toContain("from '@offthegully/veneerui'");
    // sibling component imports stay relative so they land working together
    expect(switcher).toContain("from './ImportPanel'");
  });

  // The registry stays framework-neutral: no `'use client'` directive baked in.
  // `veneerui add` injects it only for a Next target (see add.ts /
  // withClientDirective), so Vite/Remix/CSR copies stay pristine.
  it('ships framework-neutral source — no baked-in "use client" directive', () => {
    for (const c of components) {
      const src = readComponentSource(c.file);
      expect(src.startsWith("'use client'"), `${c.file} must not bake in the directive`).toBe(false);
    }
  });

  it('gates the switcher trigger on hydrated so SSR has a neutral first paint', () => {
    const switcher = readComponentSource('ThemeSwitcher.tsx');
    expect(switcher).toContain('hydrated');
  });
});
