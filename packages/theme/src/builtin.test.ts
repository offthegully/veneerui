/**
 * Built-in themes must themselves satisfy the schema they ship with. This runs
 * each one through the real validator (Node value-checker) and asserts it's
 * clean AND that no tokens were silently dropped — catching a typo'd token name
 * or an invalid value at build time rather than as a dead override at runtime.
 */
import { describe, expect, it } from 'vitest';
import { BUILTIN_THEMES, BUILTIN_IDS, DEFAULT_THEME_ID } from './builtin';
import { validateTheme } from './validate';
import { nodeCheckValue } from './value-check-node';

describe('built-in themes', () => {
  it('has a unique, stable id per theme and a real default', () => {
    const ids = BUILTIN_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(DEFAULT_THEME_ID);
    expect(BUILTIN_IDS.has(DEFAULT_THEME_ID)).toBe(true);
  });

  for (const theme of BUILTIN_THEMES) {
    it(`"${theme.name}" validates with no dropped tokens`, () => {
      const result = validateTheme(theme, nodeCheckValue);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
      // Every authored token survived validation (no unknown names, no invalid values).
      expect(Object.keys(result.theme!.tokens).length).toBe(Object.keys(theme.tokens).length);
    });
  }
});
