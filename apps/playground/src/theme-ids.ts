/**
 * The playground's curated id lists, kept free of `import.meta.glob` (unlike
 * themes.ts) so plain Node — namely vite.config.ts — can import them too. Both
 * the runtime ThemeProvider seed and the build-time anti-flash plugin read from
 * here, so the switcher set and the first-visit random pool can never drift.
 */

/** Applied on a visitor's first load, and the structural fallback (see themes.ts). */
export const APP_DEFAULT_THEME_ID = 'default-light';

/**
 * The curated set the switcher shows on a first load — seven solid themes that
 * span the axes (serif, warm, mono, structural, dark) without overwhelming.
 * The other six stay in the library and remain one click away in the gallery
 * panel; a returning visitor's own enabled set is preserved. Order here is the
 * switcher order: neutral defaults → light/expressive → dark.
 */
export const APP_ENABLED_THEME_IDS = [
  'default-light',
  'default-dark',
  'editorial',
  'warm-library',
  'monospaced',
  'brutalist',
  'terminal',
];

/**
 * The pool a first-time visitor is randomly dropped into. It's the enabled set
 * minus the two neutral defaults: a fresh visitor always lands on a *distinctive*
 * theme (the point of the showcase), while Light/Dark stay in the switcher as the
 * obvious way back. Every id here is a gallery theme, so vite.config can read its
 * tokens straight off disk to inline into the flash-free first-paint script.
 */
export const APP_FIRST_VISIT_THEME_IDS = APP_ENABLED_THEME_IDS.filter(
  (id) => id !== 'default-light' && id !== 'default-dark',
);
