/**
 * Theme context + hook. Kept in a non-component module so ThemeProvider.tsx can
 * export only its component (react-refresh/only-export-components).
 */
import { createContext, useContext } from 'react';
import type { Theme } from './types';

export interface ThemeContextValue {
  /** Every theme in the library (the app-owned set). */
  themes: Theme[];
  /** Ids shown in the switcher, in display order. */
  enabledIds: string[];
  /** Id of the theme currently applied to the DOM. */
  currentId: string;
  /** The theme currently applied. */
  current: Theme;
  /**
   * False during SSR and the *first* client render, true once mounted. The
   * persisted theme is client-only state, so anything that renders theme
   * *identity* into markup — the current theme's name, its swatches — must render
   * a stable, theme-neutral output while this is false and reveal the real value
   * only after it flips, or the server HTML won't match the first client render.
   * CSS-variable styling (the `bg-surface`/`text-text` utilities) is exempt: it's
   * applied to the DOM by the anti-flash script and `applyTheme`, never through
   * React's tree.
   */
  hydrated: boolean;
  /** `themes` filtered & ordered by `enabledIds` — what the switcher renders. */
  enabledThemes: Theme[];
  /** Switch the applied theme. No-op if `id` isn't a known, enabled theme. */
  setCurrent: (id: string) => void;
  /** Show/hide a theme in the switcher. */
  setEnabled: (id: string, enabled: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a <ThemeProvider>');
  return ctx;
}
