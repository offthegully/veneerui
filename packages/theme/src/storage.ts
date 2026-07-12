/**
 * localStorage persistence for the visitor's theme choices. There is no server —
 * this is the whole store. Everything here is defensive: a corrupt or stale blob
 * must never brick the app, so any problem falls back to "all app themes, the
 * default current" rather than throwing.
 *
 * Theme definitions are NOT persisted — every theme re-seeds from the app bundle
 * on load, so the app is always authoritative over what it ships. What persists
 * is the visitor's choices (currentId, enabledIds) plus a snapshot of the current
 * theme's tokens, which is what lets the synchronous anti-flash script
 * (anti-flash.ts) apply the current theme before any JS module loads — both read
 * STORAGE_KEY from ./storage-key so they can never drift.
 */
import type { Theme, ThemeLibrary } from './types';
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from './builtin';
import { STORAGE_KEY } from './storage-key';

export { STORAGE_KEY } from './storage-key';

/**
 * The persisted shape. `currentTokens` exists only for the anti-flash script;
 * loadLibrary never reads it (the live theme definition wins). Older blobs
 * persisted the full library — their `currentId`/`enabledIds` fields match this
 * shape, so a returning visitor's selection survives the format change.
 */
interface PersistedState {
  currentId: string;
  enabledIds: string[];
  currentTokens: Record<string, string>;
}

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
 * Build the library from the app's own theme set plus the visitor's persisted
 * choices.
 *
 * `appThemes` is the app-owned set (the package built-ins by default, or a set
 * the developer ships via `<ThemeProvider themes={...}>`); `defaultId` is the
 * theme applied on a fresh load. Themes always come from the live `appThemes` —
 * so an app update that changes or removes a shipped theme is reflected even for
 * returning users. enabledIds/currentId are clamped to themes that exist.
 *
 * `defaultEnabledIds` seeds the switcher on a *first* load only; once a visitor
 * has a persisted state their own enabled set is honored (they may have turned
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
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!parsed || typeof parsed !== 'object')
      return defaultLibrary(appThemes, defaultId, defaultEnabledIds);

    const themes = [...appThemes];
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
  const current = library.themes.find((t) => t.id === library.currentId);
  const persisted: PersistedState = {
    currentId: library.currentId,
    enabledIds: library.enabledIds,
    currentTokens: current?.tokens ?? {},
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    /* quota exceeded / storage disabled — non-fatal, in-memory state still works */
  }
}
