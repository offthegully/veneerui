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
import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import type { Theme, ThemeLibrary } from './types';
import { applyTheme } from './apply';
import { loadLibrary, saveLibrary } from './storage';
import { BUILTIN_IDS, DEFAULT_THEME_ID } from './builtin';
import { ThemeContext, type ThemeContextValue } from './theme-context';

function pickFallbackId(enabledIds: string[]): string {
  if (enabledIds.includes(DEFAULT_THEME_ID)) return DEFAULT_THEME_ID;
  return enabledIds[0] ?? DEFAULT_THEME_ID;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [library, setLibrary] = useState<ThemeLibrary>(loadLibrary);
  // A theme being previewed from the import screen — applied but not yet saved.
  const [preview, setPreview] = useState<Theme | null>(null);

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

  // The preview, while active, outranks the saved current theme on the DOM.
  // Clearing it falls back to `current`, which re-applies and restores the UI.
  const applied = preview ?? current;
  useLayoutEffect(() => {
    if (applied) applyTheme(applied);
  }, [applied]);

  const setCurrent = useCallback(
    (id: string) =>
      update((lib) =>
        lib.currentId === id || !lib.enabledIds.includes(id) ? lib : { ...lib, currentId: id },
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
        if (BUILTIN_IDS.has(id)) return lib;
        const enabledIds = lib.enabledIds.filter((e) => e !== id);
        return {
          themes: lib.themes.filter((t) => t.id !== id),
          enabledIds,
          currentId: lib.currentId === id ? pickFallbackId(enabledIds) : lib.currentId,
        };
      }),
    [update],
  );

  const setEnabled = useCallback(
    (id: string, enabled: boolean) =>
      update((lib) => {
        const enabledIds = enabled
          ? lib.enabledIds.includes(id)
            ? lib.enabledIds
            : [...lib.enabledIds, id]
          : lib.enabledIds.filter((e) => e !== id);
        const currentId = enabledIds.includes(lib.currentId)
          ? lib.currentId
          : pickFallbackId(enabledIds);
        return { ...lib, enabledIds, currentId };
      }),
    [update],
  );

  const previewTheme = useCallback((theme: Theme) => setPreview(theme), []);
  const cancelPreview = useCallback(() => setPreview(null), []);

  const commitPreview = useCallback(() => {
    if (!preview) return;
    const p = preview;
    // Add (or replace), enable, and select in one persisted update, then drop
    // the preview so the applied theme falls through to this now-saved `current`.
    update((lib) => ({
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
