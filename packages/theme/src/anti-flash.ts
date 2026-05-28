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

/** The attribute the shuffle path writes the picked id to, for the provider to read. */
export const SHUFFLE_ATTR = 'data-veneer-shuffle';

/** One candidate in the shuffle pool — id plus the tokens to apply. */
export interface ShuffleTheme {
  id: string;
  tokens: Record<string, string>;
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
 * Pass `shufflePool` to instead show a *random* theme on every load until the
 * visitor pins one. The pool's tokens are inlined; on any load whose saved
 * library isn't `pinned` (including the first-ever, empty one) the script picks
 * one at random and applies it before first paint — so it's flash-free — and
 * records the pick in `SHUFFLE_ATTR` on <html> so the provider seeds the same id
 * (it does *not* write storage; the pick is intentionally ephemeral). A saved,
 * pinned library applies its current theme as usual; `defaultTokens` is the final
 * fallback (empty pool, or a pinned theme whose tokens went missing).
 */
export function getAntiFlashScript(
  defaultTokens?: Record<string, string>,
  shufflePool?: ShuffleTheme[],
): string {
  // Written in ES5-ish, dependency-free style on purpose: it runs before the
  // bundle, so it can't rely on anything the app ships. STORAGE_KEY, the default
  // tokens, and the shuffle pool are inlined as literals so the string stays
  // self-contained.
  const defaultLiteral = defaultTokens ? escapeScriptLiteral(defaultTokens) : 'null';
  const poolLiteral =
    shufflePool && shufflePool.length > 0 ? escapeScriptLiteral(shufflePool) : 'null';
  return (
    '(function(){try{' +
    'var d=' +
    defaultLiteral +
    ';var pool=' +
    poolLiteral +
    ';var key=' +
    JSON.stringify(STORAGE_KEY) +
    ';var tokens=null;' +
    'var raw=localStorage.getItem(key);' +
    'var lib=raw?JSON.parse(raw):null;' +
    // Shuffle only when a pool is configured AND the saved library isn't pinned
    // (the first-ever, empty load counts as unpinned). Otherwise this is the
    // default anti-flash path: apply the saved current theme as before.
    'var willShuffle=!!pool&&!(lib&&lib.pinned);' +
    'if(lib&&!willShuffle){var themes=lib.themes||[];' +
    'for(var i=0;i<themes.length;i++){if(themes[i]&&themes[i].id===lib.currentId&&themes[i].tokens){tokens=themes[i].tokens;break;}}}' +
    // Pick a random theme and apply it; record the pick on <html> for the provider
    // to read. Deliberately not persisted, so every refresh re-rolls until pinned.
    'if(willShuffle){var pick=pool[Math.floor(Math.random()*pool.length)];' +
    'tokens=pick.tokens;document.documentElement.setAttribute(' +
    JSON.stringify(SHUFFLE_ATTR) +
    ',pick.id);}' +
    'if(!tokens)tokens=d;' +
    'if(!tokens)return;' +
    'var s=document.documentElement.style;' +
    'for(var k in tokens){if(Object.prototype.hasOwnProperty.call(tokens,k)){s.setProperty("--"+k,tokens[k]);}}' +
    '}catch(e){}})();'
  );
}
