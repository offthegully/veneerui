/**
 * localStorage persistence for the theme library. There is no server — this is
 * the whole store. Everything here is defensive: a corrupt or stale blob must
 * never brick the app, so any problem falls back to "all built-ins, Light
 * current" rather than throwing.
 *
 * The persisted value is the entire ThemeLibrary, including each theme's full
 * token map. That's deliberate: it's what lets the synchronous anti-flash script
 * (anti-flash.ts) apply the current theme before any JS module loads — both read
 * STORAGE_KEY from ./storage-key so they can never drift.
 */
import type { ThemeLibrary } from './types';
import { BUILTIN_THEMES, BUILTIN_IDS, DEFAULT_THEME_ID } from './builtin';
import { STORAGE_KEY } from './storage-key';

export { STORAGE_KEY } from './storage-key';

function defaultLibrary(): ThemeLibrary {
  return {
    themes: [...BUILTIN_THEMES],
    enabledIds: BUILTIN_THEMES.map((t) => t.id),
    currentId: DEFAULT_THEME_ID,
  };
}

/**
 * Load and reconcile the library. Built-ins are app-owned: the live definitions
 * always replace whatever stale copies were persisted, and user-imported themes
 * are preserved. enabledIds/currentId are clamped to themes that actually exist.
 */
export function loadLibrary(): ThemeLibrary {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return defaultLibrary(); // storage unavailable (private mode, disabled)
  }
  if (!raw) return defaultLibrary();

  try {
    const parsed = JSON.parse(raw) as Partial<ThemeLibrary>;
    if (!parsed || !Array.isArray(parsed.themes)) return defaultLibrary();

    // Drop any persisted built-ins and re-seed from the live definitions, so an
    // app update that changes a built-in is reflected even for returning users.
    const userThemes = parsed.themes.filter(
      (t): t is ThemeLibrary['themes'][number] =>
        !!t && typeof t === 'object' && typeof t.id === 'string' && !BUILTIN_IDS.has(t.id),
    );
    const themes = [...BUILTIN_THEMES, ...userThemes];
    const ids = new Set(themes.map((t) => t.id));

    let enabledIds = (Array.isArray(parsed.enabledIds) ? parsed.enabledIds : []).filter(
      (id): id is string => typeof id === 'string' && ids.has(id),
    );
    if (enabledIds.length === 0) enabledIds = themes.map((t) => t.id);

    const currentId =
      typeof parsed.currentId === 'string' && enabledIds.includes(parsed.currentId)
        ? parsed.currentId
        : enabledIds.includes(DEFAULT_THEME_ID)
          ? DEFAULT_THEME_ID
          : enabledIds[0];

    return { themes, enabledIds, currentId };
  } catch {
    return defaultLibrary();
  }
}

export function saveLibrary(library: ThemeLibrary): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch {
    /* quota exceeded / storage disabled — non-fatal, in-memory state still works */
  }
}
