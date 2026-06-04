/**
 * The playground's app-owned theme set.
 *
 * Veneer ships its whole theme library as `BUILTIN_THEMES` from the package
 * (`@offthegully/veneerui`) — the two neutral defaults (`default-light`,
 * `default-dark`) plus the gallery themes, all pre-normalized. The playground is
 * just a consumer: it imports that set rather than re-loading theme files, so it
 * sees exactly what any external app sees — one source of truth.
 *
 * Gallery JSON under `gallery/themes/<slug>/theme.json` remains the upstream
 * *authoring* source; it's vendored into the package by `scripts/gen-builtin.ts`
 * and guarded against drift by `check:builtin`. The playground no longer reads it
 * directly.
 *
 * `default-light` stays the default: it authors only the three required tokens, so
 * the synchronous cold-flash path (which falls back to the CSS `:root` schema
 * defaults) matches it without any extra wiring.
 */
import { BUILTIN_THEMES, type Theme } from '@offthegully/veneerui';

// Re-export so existing importers (main.tsx) keep their `./themes` entry point;
// the curated default id lives in theme-ids.ts, which vite.config can also read.
export { APP_DEFAULT_THEME_ID } from './theme-ids';

/** The two neutral package defaults that lead the list, in this order. */
const DEFAULT_IDS = ['default-light', 'default-dark'];

/** Deliberate gallery-panel order: light/neutral → expressive → dark/effect. */
const GALLERY_ORDER = [
  'editorial',
  'warm-library',
  'sunset-paper',
  'monospaced',
  'neumorphic',
  'high-contrast',
  'brutalist',
  'windows-95',
  'glassmorphic',
  'terminal',
  'neon-arcade',
];

/** Gallery position for a slug; unknown ids sort to the end (stable, deterministic). */
const orderOf = (id: string): number => {
  const i = GALLERY_ORDER.indexOf(id);
  return i === -1 ? GALLERY_ORDER.length : i;
};

// The two package defaults lead, in DEFAULT_IDS order (skipped if ever missing).
const defaults = DEFAULT_IDS.map((id) => BUILTIN_THEMES.find((t) => t.id === id)).filter(
  (t): t is Theme => t != null,
);

// Everything that isn't a neutral default — the gallery themes — in gallery order.
const galleryThemes: Theme[] = BUILTIN_THEMES.filter((t) => !DEFAULT_IDS.includes(t.id)).sort(
  (a, b) => orderOf(a.id) - orderOf(b.id),
);

/**
 * The full app theme set: 2 package defaults + 11 gallery themes = 13. This is
 * the whole *library* — every entry ships enabled in the switcher (main.tsx
 * passes no `defaultEnabledIds`) and shows in the "Browse gallery" panel.
 * Module-level constant so the ThemeProvider seed is stable.
 */
export const APP_THEMES: Theme[] = [...defaults, ...galleryThemes];

/**
 * The pool a first-time visitor is randomly dropped into: every gallery theme,
 * in gallery order. It excludes the two neutral package defaults so a fresh
 * visitor always lands on a *distinctive* theme (the point of the showcase),
 * while Light/Dark stay in the switcher as the obvious way back. Derived from the
 * same `BUILTIN_THEMES` the flash-free script (vite.config) reads, so the two
 * pools always agree.
 */
export const APP_SHUFFLE_THEME_IDS: string[] = galleryThemes.map((t) => t.id);
