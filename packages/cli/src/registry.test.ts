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
});
