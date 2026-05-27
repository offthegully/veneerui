/**
 * defineTheme — fills app-owned bookkeeping and yields a theme the validator
 * accepts. Validation runs through the browser value-checker, matching how an
 * app would consume a developer-authored theme.
 */
import { describe, expect, it } from 'vitest';
import { defineTheme } from './define-theme';
import { validateTheme } from './validate';
import { nodeCheckValue } from './value-check-node';
import { BUILTIN_THEMES } from './builtin';
import { SCHEMA_VERSION } from './types';

describe('defineTheme', () => {
  it('fills bookkeeping fields and marks the theme app-owned', () => {
    const theme = defineTheme({
      id: 'brutalist',
      name: 'Brutalist',
      tokens: { 'color-primary': '#000000' },
    });
    expect(theme.source).toBe('builtin');
    expect(theme.version).toBe('1.0.0');
    expect(theme.schemaVersion).toBe(SCHEMA_VERSION);
    expect(theme.author).toEqual({ id: 'app', name: 'App' });
  });

  it('passes the supplied slice through and honors overrides', () => {
    const theme = defineTheme({
      id: 'x',
      name: 'X',
      description: 'desc',
      tags: ['dark'],
      tokens: { 'color-primary': '#111111' },
      author: { id: 'acme', name: 'Acme' },
      version: '2.1.0',
      license: 'MIT',
    });
    expect(theme.description).toBe('desc');
    expect(theme.tags).toEqual(['dark']);
    expect(theme.tokens).toEqual({ 'color-primary': '#111111' });
    expect(theme.author).toEqual({ id: 'acme', name: 'Acme' });
    expect(theme.version).toBe('2.1.0');
    expect(theme.license).toBe('MIT');
  });

  it('produces a theme the validator accepts', () => {
    // Reuse a built-in's token set so every required token is present —
    // the point of this test is the bookkeeping, not re-deriving the schema.
    const theme = defineTheme({
      id: 'ok',
      name: 'OK',
      tokens: BUILTIN_THEMES[0].tokens,
    });
    const result = validateTheme(theme, nodeCheckValue);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
