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
import type { Theme, ThemeLibrary } from './types';
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from './builtin';
import { STORAGE_KEY } from './storage-key';

export { STORAGE_KEY } from './storage-key';

/**
 * The set shown in the switcher on a fresh load. Defaults to *every* app theme;
 * pass `defaultEnabledIds` to ship a curated subset (the rest stay in the library
 * and remain discoverable in the gallery panel). Unknown ids are dropped, and an
 * empty/all-bogus list falls back to "all" so a typo can't leave an empty switcher.
 */
function seedEnabledIds(appThemes: Theme[], defaultEnabledIds?: string[]): string[] {
  if (!defaultEnabledIds) return appThemes.map((t) => t.id);
  const ids = new Set(appThemes.map((t) => t.id));
  const seeded = defaultEnabledIds.filter((id) => ids.has(id));
  return seeded.length > 0 ? seeded : appThemes.map((t) => t.id);
}

function defaultLibrary(
  appThemes: Theme[],
  defaultId: string,
  defaultEnabledIds?: string[],
): ThemeLibrary {
  return {
    themes: [...appThemes],
    enabledIds: seedEnabledIds(appThemes, defaultEnabledIds),
    currentId: defaultId,
  };
}

/**
 * Load and reconcile the library against the app's own theme set.
 *
 * `appThemes` is the app-owned tier (the package built-ins by default, or a set
 * the developer ships via `<ThemeProvider themes={...}>`); `defaultId` is the
 * theme applied on a fresh load. The live `appThemes` always replace whatever
 * app-owned copies were persisted — so an app update that changes or removes a
 * shipped theme is reflected even for returning users — while a visitor's own
 * imported/custom themes are preserved. We partition by `source`, not by id:
 * an id-based filter would leave a *removed* shipped theme lingering forever as
 * a fake "user theme". enabledIds/currentId are clamped to themes that exist.
 *
 * `defaultEnabledIds` seeds the switcher on a *first* load only; once a visitor
 * has a persisted library their own enabled set is honored (they may have turned
 * gallery themes on or off), so it is not re-applied on return.
 */
export function loadLibrary(
  appThemes: Theme[] = BUILTIN_THEMES,
  defaultId: string = DEFAULT_THEME_ID,
  defaultEnabledIds?: string[],
): ThemeLibrary {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return defaultLibrary(appThemes, defaultId, defaultEnabledIds); // storage unavailable (private mode, disabled)
  }
  if (!raw) return defaultLibrary(appThemes, defaultId, defaultEnabledIds);

  try {
    const parsed = JSON.parse(raw) as Partial<ThemeLibrary>;
    if (!parsed || !Array.isArray(parsed.themes))
      return defaultLibrary(appThemes, defaultId, defaultEnabledIds);

    // Keep only the user tier (imported/custom) and re-seed the app tier from
    // the live definitions, so the app stays authoritative over what it ships.
    const userThemes = parsed.themes.filter(
      (t): t is ThemeLibrary['themes'][number] =>
        !!t &&
        typeof t === 'object' &&
        typeof t.id === 'string' &&
        (t.source === 'imported' || t.source === 'custom'),
    );
    const themes = [...appThemes, ...userThemes];
    const ids = new Set(themes.map((t) => t.id));

    let enabledIds = (Array.isArray(parsed.enabledIds) ? parsed.enabledIds : []).filter(
      (id): id is string => typeof id === 'string' && ids.has(id),
    );
    if (enabledIds.length === 0) enabledIds = themes.map((t) => t.id);

    const currentId =
      typeof parsed.currentId === 'string' && enabledIds.includes(parsed.currentId)
        ? parsed.currentId
        : enabledIds.includes(defaultId)
          ? defaultId
          : enabledIds[0];

    return { themes, enabledIds, currentId };
  } catch {
    return defaultLibrary(appThemes, defaultId, defaultEnabledIds);
  }
}

export function saveLibrary(library: ThemeLibrary): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch {
    /* quota exceeded / storage disabled — non-fatal, in-memory state still works */
  }
}
