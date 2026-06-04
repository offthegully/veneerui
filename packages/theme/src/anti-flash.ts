/**
 * Anti-flash: the synchronous script that applies a returning user's saved theme
 * to <html> *before* any stylesheet or module loads, so they never see the
 * default theme flash. It must run inline in <head>, so it ships as a string of
 * self-contained JS (no imports, no bundle dependency) that a framework adapter
 * drops into a <script>.
 *
 * It reads the same localStorage blob storage.ts writes (via STORAGE_KEY) and
 * performs the same write applyTheme() does — set `--<token>` custom properties
 * on documentElement for the current theme. Keep the three in sync.
 *
 * Adapters that consume this:
 *   - Vite:  `@offthegully/veneerui/vite` injects it into index.html (head-prepend).
 *   - Next:  render `<AntiFlashScript />` in app/layout.tsx's <head>.
 *   - Manual: `<script>{getAntiFlashScript()}</script>` in your document head.
 */
import { STORAGE_KEY } from './storage-key';

/** Escape `<` so an inlined token value can never break out of the <script> tag. */
const escapeScriptLiteral = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, '\\u003c');

/**
 * The inline JS as a string (an IIFE), without the surrounding `<script>` tags.
 *
 * Pass `defaultTokens` — the token map of the app's default theme — to also kill
 * the *cold* flash: on a visitor's first-ever load there's no saved library, so
 * without this the page paints the CSS `:root` schema defaults before React
 * applies the real default. With it, the default theme's tokens are inlined and
 * applied immediately. Keep it in sync with `<ThemeProvider defaultThemeId>`;
 * this script runs before React and can't read the prop. Omit it to preserve
 * the original behavior (no overrides until a theme has been saved).
 */
export function getAntiFlashScript(defaultTokens?: Record<string, string>): string {
  // Written in ES5-ish, dependency-free style on purpose: it runs before the
  // bundle, so it can't rely on anything the app ships. STORAGE_KEY and the
  // default tokens are inlined as literals so the string stays self-contained.
  const defaultLiteral = defaultTokens ? escapeScriptLiteral(defaultTokens) : 'null';
  return (
    '(function(){try{' +
    'var d=' +
    defaultLiteral +
    ';var key=' +
    JSON.stringify(STORAGE_KEY) +
    ';var tokens=null;' +
    'var raw=localStorage.getItem(key);' +
    'var lib=raw?JSON.parse(raw):null;' +
    'if(lib){var themes=lib.themes||[];' +
    'for(var i=0;i<themes.length;i++){if(themes[i]&&themes[i].id===lib.currentId&&themes[i].tokens){tokens=themes[i].tokens;break;}}}' +
    'if(!tokens)tokens=d;' +
    'if(!tokens)return;' +
    'var s=document.documentElement.style;' +
    'for(var k in tokens){if(Object.prototype.hasOwnProperty.call(tokens,k)){s.setProperty("--"+k,tokens[k]);}}' +
    '}catch(e){}})();'
  );
}
