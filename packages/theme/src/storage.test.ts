/**
 * storage reconciliation — the defensive load path. These run under the node
 * test env, so localStorage is stubbed with a tiny in-memory shim.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadLibrary, saveLibrary, STORAGE_KEY } from './storage';
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from './builtin';
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
});
