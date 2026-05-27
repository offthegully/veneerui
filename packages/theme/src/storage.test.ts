/**
 * storage reconciliation — the defensive load path. These run under the node
 * test env, so localStorage is stubbed with a tiny in-memory shim.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadLibrary, saveLibrary, STORAGE_KEY } from './storage';
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from './builtin';
import { defineTheme } from './define-theme';
import type { Theme } from './types';

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

const userTheme: Theme = {
  id: 'custom-1',
  name: 'Mine',
  author: { id: '', name: 'me' },
  version: '1.0.0',
  schemaVersion: 1,
  tokens: { 'color-primary': '#ff0000' },
  source: 'imported',
};

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

  it('replaces a stale persisted built-in with the live definition', () => {
    saveLibrary({
      themes: [{ ...BUILTIN_THEMES[0], tokens: { 'color-primary': '#000000' }, version: '0.0.1' }],
      enabledIds: [DEFAULT_THEME_ID],
      currentId: DEFAULT_THEME_ID,
    });
    const loaded = loadLibrary().themes.find((t) => t.id === DEFAULT_THEME_ID)!;
    expect(loaded.tokens).toEqual(BUILTIN_THEMES[0].tokens);
    expect(loaded.version).toBe(BUILTIN_THEMES[0].version);
  });

  it('preserves imported themes and a valid current selection', () => {
    saveLibrary({
      themes: [...BUILTIN_THEMES, userTheme],
      enabledIds: [DEFAULT_THEME_ID, 'custom-1'],
      currentId: 'custom-1',
    });
    const lib = loadLibrary();
    expect(lib.themes.find((t) => t.id === 'custom-1')).toBeTruthy();
    expect(lib.currentId).toBe('custom-1');
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

  it('defaults to unpinned on a fresh load', () => {
    expect(loadLibrary().pinned).toBe(false);
  });

  it('round-trips a pinned selection', () => {
    saveLibrary({
      themes: [...BUILTIN_THEMES],
      enabledIds: BUILTIN_THEMES.map((t) => t.id),
      currentId: 'editorial',
      pinned: true,
    });
    const lib = loadLibrary();
    expect(lib.currentId).toBe('editorial');
    expect(lib.pinned).toBe(true);
  });

  it('drops the pin when the pinned current is clamped away', () => {
    // currentId no longer exists → reconciliation clamps it, so the pin no longer applies.
    saveLibrary({ themes: [...BUILTIN_THEMES], enabledIds: ['ghost'], currentId: 'ghost', pinned: true });
    const lib = loadLibrary();
    expect(lib.currentId).toBe(DEFAULT_THEME_ID);
    expect(lib.pinned).toBe(false);
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

  it('re-seeds the app tier and preserves the user tier', () => {
    saveLibrary({
      themes: [appThemes[0], userTheme],
      enabledIds: ['brutalist', 'custom-1'],
      currentId: 'custom-1',
    });
    const lib = loadLibrary(appThemes, 'brutalist');
    // both shipped themes present (re-seeded), plus the imported one preserved
    expect(lib.themes.map((t) => t.id).sort()).toEqual(['brutalist', 'custom-1', 'soft']);
    expect(lib.currentId).toBe('custom-1');
  });

  it('does not let a removed app theme linger as a fake user theme', () => {
    // Persist an app theme that the live set no longer ships.
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
