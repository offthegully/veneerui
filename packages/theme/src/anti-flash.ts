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

/** The inline JS as a string (an IIFE), without the surrounding `<script>` tags. */
export function getAntiFlashScript(): string {
  // Written in ES5-ish, dependency-free style on purpose: it runs before the
  // bundle, so it can't rely on anything the app ships. STORAGE_KEY is inlined
  // as a literal so the string stays self-contained.
  return (
    '(function(){try{' +
    'var raw=localStorage.getItem(' +
    JSON.stringify(STORAGE_KEY) +
    ');if(!raw)return;' +
    'var lib=JSON.parse(raw);var themes=(lib&&lib.themes)||[];var theme=null;' +
    'for(var i=0;i<themes.length;i++){if(themes[i]&&themes[i].id===lib.currentId){theme=themes[i];break;}}' +
    'if(!theme||!theme.tokens)return;' +
    'var s=document.documentElement.style;' +
    'for(var k in theme.tokens){if(Object.prototype.hasOwnProperty.call(theme.tokens,k)){s.setProperty("--"+k,theme.tokens[k]);}}' +
    '}catch(e){}})();'
  );
}
