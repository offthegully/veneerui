/**
 * storage reconciliation — the defensive load path. These run under the node
 * test env, so localStorage is stubbed with a tiny in-memory shim.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadLibrary, saveLibrary, STORAGE_KEY } from './storage';
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from './builtin';
import { defineTheme } from './define-theme';

function memoryStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => void (store[k] = v),
    removeItem: (k: string) => void delete store[k],
    clear: () => void (store = {}),
  };
}

beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
afterEach(() => vi.unstubAllGlobals());

describe('loadLibrary', () => {
  it('seeds all built-ins with Light current on a fresh load', () => {
    const lib = loadLibrary();
    expect(lib.themes.map((t) => t.id)).toEqual(BUILTIN_THEMES.map((t) => t.id));
    expect(lib.currentId).toBe(DEFAULT_THEME_ID);
    expect(lib.enabledIds).toEqual(BUILTIN_THEMES.map((t) => t.id));
  });

  it('falls back to defaults on malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{ not json');
    expect(loadLibrary().currentId).toBe(DEFAULT_THEME_ID);
  });

  it('always serves the live theme definitions, never persisted copies', () => {
    // Even if a (legacy) blob carried stale theme definitions, the loaded
    // library is built from the app bundle alone.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        themes: [{ ...BUILTIN_THEMES[0], tokens: { 'color-primary': '#000000' }, version: '0.0.1' }],
        enabledIds: [DEFAULT_THEME_ID],
        currentId: DEFAULT_THEME_ID,
      }),
    );
    const loaded = loadLibrary().themes.find((t) => t.id === DEFAULT_THEME_ID)!;
    expect(loaded.tokens).toEqual(BUILTIN_THEMES[0].tokens);
    expect(loaded.version).toBe(BUILTIN_THEMES[0].version);
  });

  it('honors currentId/enabledIds from a legacy full-library blob', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        themes: BUILTIN_THEMES,
        enabledIds: [DEFAULT_THEME_ID, 'editorial'],
        currentId: 'editorial',
      }),
    );
    const lib = loadLibrary();
    expect(lib.currentId).toBe('editorial');
    expect(lib.enabledIds).toEqual([DEFAULT_THEME_ID, 'editorial']);
  });

  it('clamps a current/enabled id that no longer exists', () => {
    saveLibrary({ themes: [...BUILTIN_THEMES], enabledIds: ['ghost'], currentId: 'ghost' });
    const lib = loadLibrary();
    // enabledIds was emptied by the filter, so it resets to all themes...
    expect(lib.enabledIds.length).toBe(BUILTIN_THEMES.length);
    expect(lib.currentId).toBe(DEFAULT_THEME_ID);
  });

  it('round-trips through save/load', () => {
    saveLibrary({ themes: [...BUILTIN_THEMES], enabledIds: BUILTIN_THEMES.map((t) => t.id), currentId: 'editorial' });
    expect(loadLibrary().currentId).toBe('editorial');
  });
});

describe('saveLibrary', () => {
  it('persists the current theme tokens for the anti-flash script, not the library', () => {
    const editorial = BUILTIN_THEMES.find((t) => t.id === 'editorial')!;
    saveLibrary({
      themes: [...BUILTIN_THEMES],
      enabledIds: BUILTIN_THEMES.map((t) => t.id),
      currentId: 'editorial',
    });
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(persisted.currentId).toBe('editorial');
    expect(persisted.currentTokens).toEqual(editorial.tokens);
    expect(persisted.themes).toBeUndefined();
  });
});

describe('loadLibrary with a developer-supplied theme set', () => {
  const appThemes = [
    defineTheme({ id: 'brutalist', name: 'Brutalist', tokens: { 'color-primary': '#000000' } }),
    defineTheme({ id: 'soft', name: 'Soft', tokens: { 'color-primary': '#eeeeee' } }),
  ];

  it('seeds from the supplied themes and default id on a fresh load', () => {
    const lib = loadLibrary(appThemes, 'soft');
    expect(lib.themes.map((t) => t.id)).toEqual(['brutalist', 'soft']);
    expect(lib.enabledIds).toEqual(['brutalist', 'soft']);
    expect(lib.currentId).toBe('soft');
  });

  it('does not resurrect a removed app theme from the persisted state', () => {
    // Persist choices pointing at an app theme the live set no longer ships.
    const removed = defineTheme({ id: 'retired', name: 'Retired', tokens: { 'color-primary': '#123456' } });
    saveLibrary({
      themes: [...appThemes, removed],
      enabledIds: ['brutalist', 'soft', 'retired'],
      currentId: 'retired',
    });
    const lib = loadLibrary(appThemes, 'brutalist');
    expect(lib.themes.map((t) => t.id)).toEqual(['brutalist', 'soft']);
    expect(lib.enabledIds).not.toContain('retired');
    // current pointed at the now-gone theme → falls back to the default id
    expect(lib.currentId).toBe('brutalist');
  });

  it('falls back to the first enabled theme when the default id is not enabled', () => {
    saveLibrary({ themes: [...appThemes], enabledIds: ['soft'], currentId: 'ghost' });
    const lib = loadLibrary(appThemes, 'missing-default');
    expect(lib.currentId).toBe('soft');
  });
});
