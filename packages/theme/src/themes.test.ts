/**
 * Guards the `@offthegully/veneerui/themes` subpath: it must expose the data +
 * authoring helpers AND stay free of any React-context import, so it's safe to
 * import from a Next Server Component (see ./themes.ts). The build step proves
 * the emitted `dist/themes.js` has no `createContext`; this test locks the
 * source-level invariant so a future re-export can't silently re-pollute it.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  defineTheme,
  BUILTIN_THEMES,
  DEFAULT_THEME_ID,
  TOKEN_SCHEMA,
  ALLOWED_FONT_FAMILIES,
} from './themes';

describe('@offthegully/veneerui/themes — server-importable data slice', () => {
  it('exposes the built-ins and the token schema', () => {
    expect(BUILTIN_THEMES.length).toBeGreaterThan(0);
    expect(BUILTIN_THEMES.some((t) => t.id === DEFAULT_THEME_ID)).toBe(true);
    expect(TOKEN_SCHEMA.length).toBeGreaterThan(0);
    expect(ALLOWED_FONT_FAMILIES.size).toBeGreaterThan(0);
  });

  it('defineTheme produces a complete Theme from the authored slice', () => {
    const t = defineTheme({ id: 'brand', name: 'Brand', tokens: { 'color-primary': '#ff0000' } });
    expect(t.id).toBe('brand');
    expect(t.schemaVersion).toBeGreaterThan(0);
    expect(t.tokens['color-primary']).toBe('#ff0000');
  });

  it('does not import the React context (would crash a Server Component)', () => {
    const src = readFileSync(fileURLToPath(new URL('./themes.ts', import.meta.url)), 'utf8');
    // The whole point of the subpath: none of these context-bearing modules.
    for (const forbidden of ['./index', './theme-context', './ThemeProvider', './apply']) {
      expect(src).not.toContain(`from '${forbidden}'`);
    }
  });
});
