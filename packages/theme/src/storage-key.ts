/**
 * The single localStorage key for the persisted ThemeLibrary. Lives in its own
 * module so the synchronous anti-flash script (anti-flash.ts) can read the same
 * key without pulling in storage.ts's dependency on the built-in themes.
 */
export const STORAGE_KEY = 'veneer.theme-library.v1';
