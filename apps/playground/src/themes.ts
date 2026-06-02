/**
 * The playground's app-owned theme set.
 *
 * The gallery themes (`gallery/themes/<slug>/theme.json`) are the canonical
 * example set, so we load them straight from the gallery at build time — the same
 * source the gallery test validates — rather than re-authoring copies. To those we
 * prepend the package's two neutral defaults (`default-light`, `default-dark`),
 * which have no gallery equivalent and whose ids are referenced by storage and the
 * anti-flash path.
 *
 * `default-light` stays the default: it authors only the three required tokens, so
 * the synchronous cold-flash path (which falls back to the CSS `:root` schema
 * defaults) matches it without any extra wiring.
 *
 * Where a gallery slug reuses a package built-in id (brutalist / editorial /
 * high-contrast), the gallery version wins — it's the fuller, canonical authoring.
 * The result is one entry per id; passed to <ThemeProvider themes={...}> they
 * become the non-deletable app tier.
 */
import {
  BUILTIN_THEMES,
  normalizeAuthoredTheme,
  type AuthoredTheme,
  type Theme,
} from '@offthegully/veneerui';

// Re-export so existing importers (main.tsx) keep their `./themes` entry point;
// the curated default id lives in theme-ids.ts, which vite.config can also read.
export { APP_DEFAULT_THEME_ID } from './theme-ids';

// Read every gallery theme.json at transform time (no Node fs) — same glob the
// gallery test uses, so the two can never see a different set. The package's
// built-ins are generated from these same files (scripts/gen-builtin.ts), so the
// shared `normalizeAuthoredTheme` yields objects identical to BUILTIN_THEMES.
const galleryModules = import.meta.glob<AuthoredTheme>('../../../gallery/themes/*/theme.json', {
  import: 'default',
  eager: true,
});

/** slug = the directory name, e.g. ".../themes/editorial/theme.json" → "editorial". */
function slugOf(path: string): string {
  return path.split('/').slice(-2, -1)[0];
}

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

const galleryThemes: Theme[] = Object.entries(galleryModules)
  .map(([path, src]) => normalizeAuthoredTheme(slugOf(path), src))
  // Stable, intentional ordering independent of glob/filesystem order.
  .sort((a, b) => GALLERY_ORDER.indexOf(a.id) - GALLERY_ORDER.indexOf(b.id));

const packageDefault = (id: string): Theme | undefined => BUILTIN_THEMES.find((t) => t.id === id);

/** The two neutral package defaults that lead the list (skipped if ever missing). */
const defaults = ['default-light', 'default-dark']
  .map(packageDefault)
  .filter((t): t is Theme => t != null);

// Dedup by id; the package defaults lead, gallery themes win any id collision.
const byId = new Map<string, Theme>();
for (const t of defaults) byId.set(t.id, t);
for (const t of galleryThemes) byId.set(t.id, t);

/**
 * The full app theme set: 2 package defaults + 11 gallery themes = 13. This is
 * the whole *library* — every entry ships enabled in the switcher (main.tsx
 * passes no `defaultEnabledIds`) and shows in the "Browse gallery" panel.
 * Module-level constant so the ThemeProvider seed is stable.
 */
export const APP_THEMES: Theme[] = [...byId.values()];

/**
 * The pool a first-time visitor is randomly dropped into: every gallery theme,
 * in gallery order. It excludes the two neutral package defaults so a fresh
 * visitor always lands on a *distinctive* theme (the point of the showcase),
 * while Light/Dark stay in the switcher as the obvious way back. Derived from the
 * gallery glob, so a new `gallery/themes/<slug>/theme.json` joins it with no extra
 * wiring; vite.config reads the same directory off disk for the flash-free script.
 */
export const APP_SHUFFLE_THEME_IDS: string[] = galleryThemes.map((t) => t.id);
