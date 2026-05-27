import { describe, expect, it } from 'vitest';
import { validateTheme } from './validate';
import { nodeCheckValue } from './value-check.node';
import { SCHEMA_VERSION } from './types';

const base = {
  name: 'Test Theme',
  author: 'tester',
  version: '1.0.0',
  schemaVersion: SCHEMA_VERSION,
  tokens: {
    'color-primary': '#3b82f6',
    'color-surface': '#ffffff',
    'color-text': '#111827',
    'text-base': '16px',
    'font-sans': "'Inter Variable', system-ui, sans-serif",
  },
};
const check = (json: unknown) => validateTheme(json, nodeCheckValue);

describe('validateTheme', () => {
  it('accepts a well-formed theme and returns a normalized theme', () => {
    const result = check(base);
    expect(result.valid).toBe(true);
    expect(result.theme?.tokens['color-primary']).toBe('#3b82f6');
    expect(result.theme?.author).toEqual({ id: '', name: 'tester' });
    expect(result.theme?.source).toBe('custom');
  });

  it('rejects a CSS-injection payload', () => {
    const result = check({ ...base, tokens: { ...base.tokens, 'color-primary': 'red; } body { display:none' } });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'tokens.color-primary')).toBe(true);
  });

  it('rejects url() even inside an otherwise-valid value', () => {
    const result = check({ ...base, tokens: { ...base.tokens, 'gradient-primary': 'url(http://evil.test/x.png)' } });
    expect(result.valid).toBe(false);
  });

  it('drops unknown token names without failing', () => {
    const result = check({ ...base, tokens: { ...base.tokens, 'totally-made-up': '#fff' } });
    expect(result.valid).toBe(true);
    expect(result.theme?.tokens['totally-made-up']).toBeUndefined();
  });

  it('rejects a font family outside the bundled set', () => {
    const result = check({ ...base, tokens: { ...base.tokens, 'font-display': "'Comic Sans MS', cursive" } });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'tokens.font-display')).toBe(true);
  });

  it('accepts a bundled display font', () => {
    const result = check({ ...base, tokens: { ...base.tokens, 'font-display': "'Archivo Black', sans-serif" } });
    expect(result.valid).toBe(true);
  });

  it('fails when a required token is missing', () => {
    const tokens = { ...base.tokens } as Record<string, string>;
    delete tokens['color-primary'];
    const result = check({ ...base, tokens });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'tokens.color-primary')).toBe(true);
  });

  it('rejects an invalid color value', () => {
    const result = check({ ...base, tokens: { ...base.tokens, 'color-primary': 'not-a-color' } });
    expect(result.valid).toBe(false);
  });

  it('rejects an unsupported schemaVersion', () => {
    const result = check({ ...base, schemaVersion: 99 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'schemaVersion')).toBe(true);
  });

  it('validates shadow, easing, gradient, and number types', () => {
    const result = check({
      ...base,
      tokens: {
        ...base.tokens,
        'shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'inset-shadow-sm': 'inset 0 2px 4px rgb(0 0 0 / 0.06)',
        'ease-default': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'gradient-primary': 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
        'font-weight-bold': '700',
        'duration-default': '200',
      },
    });
    expect(result.valid).toBe(true);
  });
});
