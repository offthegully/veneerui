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
 *   - Vite:  `@veneer/theme/vite` injects it into index.html (head-prepend).
 *   - Next:  render `<AntiFlashScript />` in app/layout.tsx's <head>.
 *   - Manual: `<script>{getAntiFlashScript()}</script>` in your document head.
 */
import { STORAGE_KEY } from './storage-key';

/** One candidate in the first-visit random pool — id plus the tokens to apply. */
export interface FirstVisitTheme {
  id: string;
  tokens: Record<string, string>;
}

/**
 * Randomize the theme on a visitor's first-ever load (empty storage). The script
 * picks one of `pool` at random, applies its tokens before first paint, and
 * persists the choice (so it sticks — "first visit" means once, not every reload).
 *
 * `enabledIds` is the switcher set written alongside the pick; it may be wider
 * than the pool (e.g. include neutral light/dark options the random pick skips).
 * It must line up with `<ThemeProvider defaultEnabledIds>` so React's reconcile
 * keeps the same set. An empty `pool` disables randomization.
 */
export interface FirstVisitRandom {
  pool: FirstVisitTheme[];
  enabledIds: string[];
}

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
 *
 * Pass `firstVisit` to instead pick a *random* theme on a first-ever load — the
 * pool's tokens are inlined and one is applied + persisted before first paint, so
 * the randomization is flash-free and React reads back the same saved choice.
 * `defaultTokens` remains the fallback (empty pool, or the rare race where the
 * pick can't apply).
 */
export function getAntiFlashScript(
  defaultTokens?: Record<string, string>,
  firstVisit?: FirstVisitRandom,
): string {
  // Written in ES5-ish, dependency-free style on purpose: it runs before the
  // bundle, so it can't rely on anything the app ships. STORAGE_KEY, the default
  // tokens, and the first-visit pool are inlined as literals so the string stays
  // self-contained.
  const defaultLiteral = defaultTokens ? escapeScriptLiteral(defaultTokens) : 'null';
  const firstVisitLiteral =
    firstVisit && firstVisit.pool.length > 0 ? escapeScriptLiteral(firstVisit) : 'null';
  return (
    '(function(){try{' +
    'var d=' +
    defaultLiteral +
    ';var fv=' +
    firstVisitLiteral +
    ';var key=' +
    JSON.stringify(STORAGE_KEY) +
    ';var tokens=null;' +
    'var raw=localStorage.getItem(key);' +
    'if(raw){var lib=JSON.parse(raw);var themes=(lib&&lib.themes)||[];' +
    'for(var i=0;i<themes.length;i++){if(themes[i]&&themes[i].id===lib.currentId&&themes[i].tokens){tokens=themes[i].tokens;break;}}}' +
    // True first visit (nothing saved): pick a random theme from the pool, then
    // persist it so the choice sticks and React's loadLibrary reads it back. The
    // pick is stored *with its tokens* so this same script re-applies it without
    // a flash on later loads (before any interaction writes the full library);
    // loadLibrary discards this sourceless copy and re-seeds from the app themes.
    'if(!tokens&&!raw&&fv){var pick=fv.pool[Math.floor(Math.random()*fv.pool.length)];' +
    'tokens=pick.tokens;' +
    'try{localStorage.setItem(key,JSON.stringify({themes:[pick],enabledIds:fv.enabledIds,currentId:pick.id}));}catch(e){}}' +
    'if(!tokens)tokens=d;' +
    'if(!tokens)return;' +
    'var s=document.documentElement.style;' +
    'for(var k in tokens){if(Object.prototype.hasOwnProperty.call(tokens,k)){s.setProperty("--"+k,tokens[k]);}}' +
    '}catch(e){}})();'
  );
}
