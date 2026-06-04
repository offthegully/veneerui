/**
 * The playground's one curated theme value, kept free of `import.meta.glob`
 * (unlike themes.ts) so plain Node — namely vite.config.ts — can import it too.
 *
 * The switcher ships *every* theme by default (see main.tsx: no `defaultEnabledIds`
 * is passed, so the ThemeProvider enables them all), so the only thing left to
 * curate is which theme a brand-new visitor lands on as the structural default.
 */

/** Applied on a visitor's first load, and the structural fallback (see themes.ts). */
export const APP_DEFAULT_THEME_ID = 'default-light';
