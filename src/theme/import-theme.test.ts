/**
 * The import pipeline (parse → validate → stamp provenance). Runs under Node, so
 * it uses the css-tree value checker — the same one the gallery's CI will use.
 */
import { describe, expect, it } from 'vitest';
import { parseAndValidate, isFetchableUrl } from './import-theme';
import { nodeCheckValue } from './value-check.node';

const validJson = JSON.stringify({
  name: 'Test',
  version: '1.0.0',
  schemaVersion: 1,
  author: 'tester',
  tokens: { 'color-primary': '#3b82f6', 'color-surface': '#ffffff', 'color-text': '#111827' },
});

describe('parseAndValidate', () => {
  it('accepts a valid theme and stamps source=custom', () => {
    const out = parseAndValidate(validJson, nodeCheckValue, { source: 'custom' });
    expect(out.ok).toBe(true);
    expect(out.theme?.source).toBe('custom');
    expect(out.theme?.id).toBeTruthy(); // validateTheme mints one
    expect(out.theme?.sourceUrl).toBeUndefined();
  });

  it('records provenance for an imported theme', () => {
    const url = 'https://raw.githubusercontent.com/acme/gallery/main/themes/x/theme.json';
    const out = parseAndValidate(validJson, nodeCheckValue, { source: 'imported', sourceUrl: url });
    expect(out.ok).toBe(true);
    expect(out.theme?.source).toBe('imported');
    expect(out.theme?.sourceUrl).toBe(url);
    expect(out.theme?.importedAt).toBeTruthy();
  });

  it('reports malformed JSON without throwing', () => {
    const out = parseAndValidate('{ not json', nodeCheckValue, { source: 'custom' });
    expect(out.ok).toBe(false);
    expect(out.errors[0].message).toMatch(/json/i);
    expect(out.theme).toBeUndefined();
  });

  it('rejects a malicious value at the validation boundary', () => {
    const malicious = JSON.stringify({
      name: 'Evil',
      version: '1.0.0',
      schemaVersion: 1,
      tokens: { 'color-primary': 'red; } body { display:none', 'color-surface': '#fff', 'color-text': '#000' },
    });
    const out = parseAndValidate(malicious, nodeCheckValue, { source: 'custom' });
    expect(out.ok).toBe(false);
    expect(out.errors.some((e) => e.path === 'tokens.color-primary')).toBe(true);
  });
});

describe('isFetchableUrl', () => {
  it('allows http(s) and rejects everything else', () => {
    expect(isFetchableUrl('https://raw.githubusercontent.com/a/b/main/t.json')).toBe(true);
    expect(isFetchableUrl('http://example.com/t.json')).toBe(true);
    expect(isFetchableUrl('file:///etc/passwd')).toBe(false);
    expect(isFetchableUrl('data:application/json,{}')).toBe(false);
    expect(isFetchableUrl('not a url')).toBe(false);
  });
});
