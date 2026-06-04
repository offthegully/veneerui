/**
 * ThemeProvider — owns the ThemeLibrary state, persists it to localStorage on
 * every change, and applies the current theme to the DOM.
 *
 * Switching is cheap: applyTheme mutates custom properties on documentElement
 * directly, so only this provider's consumers (the switcher) re-render — the
 * rest of the tree just sees new CSS variable values. useLayoutEffect applies
 * before paint to avoid any flash on a client-only first render; on a normal
 * reload the synchronous script in index.html has already applied the persisted
 * theme, so this just reconciles to the same values.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import type { Theme, ThemeLibrary } from './types';
import { applyTheme, withCustomColorFallback } from './apply';
import { loadLibrary, saveLibrary } from './storage';
import { BUILTIN_THEMES, DEFAULT_THEME_ID } from './builtin';
import { ThemeContext, type ThemeContextValue } from './theme-context';

function pickFallbackId(enabledIds: string[], defaultId: string): string {
  if (enabledIds.includes(defaultId)) return defaultId;
  return enabledIds[0] ?? defaultId;
}

export interface ThemeProviderProps {
  children: ReactNode;
  /**
   * The app-owned theme set. Defaults to Veneer's built-ins. Pass your own to
   * ship a custom set. Use a module-level constant — the seed runs once, so a
   * fresh array on every render is wasted work (and won't re-seed the library).
   */
  themes?: Theme[];
  /** Theme applied on a visitor's first load. Defaults to the first `themes` entry. */
  defaultThemeId?: string;
  /**
   * Which themes the switcher shows on a *first* load. Defaults to every theme in
   * `themes`; pass a curated subset to keep the switcher uncluttered while the
   * rest stay in the library (and discoverable in the gallery panel). Returning
   * visitors keep whatever set they've enabled, so this seeds, it doesn't pin.
   */
  defaultEnabledIds?: string[];
}

export function ThemeProvider({
  children,
  themes = BUILTIN_THEMES,
  defaultThemeId = themes[0]?.id ?? DEFAULT_THEME_ID,
  defaultEnabledIds,
}: ThemeProviderProps) {
  const [library, setLibrary] = useState<ThemeLibrary>(() =>
    loadLibrary(themes, defaultThemeId, defaultEnabledIds),
  );
  // The app-owned tier: these ids are non-deletable and define the fallback set.
  const appThemeIds = useMemo(() => new Set(themes.map((t) => t.id)), [themes]);
  // A theme being previewed from the import screen — applied but not yet saved.
  const [preview, setPreview] = useState<Theme | null>(null);

  // False during SSR and the first client render, true after mount. The library
  // above is seeded from localStorage, which only exists on the client — so under
  // SSR the server renders the default while the first client render already holds
  // the persisted theme. Exposing this lets identity-rendering consumers (the
  // switcher) hold a neutral first paint that matches the server, then reveal the
  // real theme once it flips. CSS variables are unaffected: applyTheme/the
  // anti-flash script write them to the DOM, not React's tree, so they never
  // participate in hydration.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // The library is the single source of truth; persist any change.
  const update = useCallback((next: (lib: ThemeLibrary) => ThemeLibrary) => {
    setLibrary((lib) => {
      const updated = next(lib);
      if (updated === lib) return lib;
      saveLibrary(updated);
      return updated;
    });
  }, []);

  const current = useMemo(
    () => library.themes.find((t) => t.id === library.currentId) ?? library.themes[0],
    [library.themes, library.currentId],
  );

  // The app's base theme declares the custom-color (`color-x-*`) palette; it's the
  // fallback source so a theme that never set a custom color can't leave it
  // undefined (custom colors have no CSS floor, unlike schema tokens).
  const baseTheme = useMemo(
    () => themes.find((t) => t.id === defaultThemeId),
    [themes, defaultThemeId],
  );

  // The preview, while active, outranks the saved current theme on the DOM.
  // Clearing it falls back to `current`, which re-applies and restores the UI.
  // Custom colors absent from the applied theme inherit from the base theme.
  const target = preview ?? current;
  const applied = useMemo(
    () => (target ? withCustomColorFallback(target, baseTheme) : target),
    [target, baseTheme],
  );
  useLayoutEffect(() => {
    if (applied) applyTheme(applied);
  }, [applied]);

  // Switch the current theme. No-op if `id` isn't enabled or is already current.
  const setCurrent = useCallback(
    (id: string) =>
      update((lib) =>
        !lib.enabledIds.includes(id) || lib.currentId === id ? lib : { ...lib, currentId: id },
      ),
    [update],
  );

  const addTheme = useCallback(
    (theme: Theme) =>
      update((lib) => ({
        ...lib,
        themes: [...lib.themes.filter((t) => t.id !== theme.id), theme],
        enabledIds: lib.enabledIds.includes(theme.id) ? lib.enabledIds : [...lib.enabledIds, theme.id],
      })),
    [update],
  );

  const removeTheme = useCallback(
    (id: string) =>
      update((lib) => {
        if (appThemeIds.has(id)) return lib;
        const enabledIds = lib.enabledIds.filter((e) => e !== id);
        const droppedCurrent = lib.currentId === id;
        return {
          ...lib,
          themes: lib.themes.filter((t) => t.id !== id),
          enabledIds,
          currentId: droppedCurrent ? pickFallbackId(enabledIds, defaultThemeId) : lib.currentId,
        };
      }),
    [update, appThemeIds, defaultThemeId],
  );

  const setEnabled = useCallback(
    (id: string, enabled: boolean) =>
      update((lib) => {
        const enabledIds = enabled
          ? lib.enabledIds.includes(id)
            ? lib.enabledIds
            : [...lib.enabledIds, id]
          : lib.enabledIds.filter((e) => e !== id);
        const keptCurrent = enabledIds.includes(lib.currentId);
        const currentId = keptCurrent ? lib.currentId : pickFallbackId(enabledIds, defaultThemeId);
        return { ...lib, enabledIds, currentId };
      }),
    [update, defaultThemeId],
  );

  const previewTheme = useCallback((theme: Theme) => setPreview(theme), []);
  const cancelPreview = useCallback(() => setPreview(null), []);

  const commitPreview = useCallback(() => {
    if (!preview) return;
    const p = preview;
    // Add (or replace), enable, and select in one persisted update, then drop
    // the preview so the applied theme falls through to this now-saved `current`.
    update((lib) => ({
      ...lib,
      themes: [...lib.themes.filter((t) => t.id !== p.id), p],
      enabledIds: lib.enabledIds.includes(p.id) ? lib.enabledIds : [...lib.enabledIds, p.id],
      currentId: p.id,
    }));
    setPreview(null);
  }, [preview, update]);

  const value = useMemo<ThemeContextValue>(() => {
    const byId = new Map(library.themes.map((t) => [t.id, t]));
    return {
      themes: library.themes,
      enabledIds: library.enabledIds,
      currentId: library.currentId,
      current,
      hydrated,
      enabledThemes: library.enabledIds
        .map((id) => byId.get(id))
        .filter((t): t is Theme => t != null),
      preview,
      setCurrent,
      addTheme,
      removeTheme,
      setEnabled,
      previewTheme,
      commitPreview,
      cancelPreview,
    };
  }, [
    library,
    current,
    preview,
    hydrated,
    setCurrent,
    addTheme,
    removeTheme,
    setEnabled,
    previewTheme,
    commitPreview,
    cancelPreview,
  ]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
