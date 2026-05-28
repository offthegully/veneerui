/**
 * `@offthegully/veneerui/vite` — a Vite plugin that injects the anti-flash script into
 * index.html, so a consumer never has to hand-edit their HTML. Add it to
 * `plugins` in vite.config and the saved theme applies before first paint.
 *
 * Pass `{ defaultTheme }` to also kill the cold-load flash on a first-ever
 * visit — use the same theme you pass to `<ThemeProvider defaultThemeId>`.
 *
 * Pass `{ shuffleUntilPinned }` instead to show a *random* theme on every load
 * until the visitor pins one (by selecting it in the switcher). The pool's tokens
 * are inlined and one is applied before first paint, so it's flash-free; pair it
 * with `<ThemeProvider shuffleIds={...}>` so the in-page shuffle matches the pool.
 */
import type { Plugin } from 'vite';
import type { Theme } from './types';
import { getAntiFlashScript, type ShuffleTheme } from './anti-flash';

export interface VeneerPluginOptions {
  /** The app's default theme; its tokens are applied before first paint when nothing is saved yet. */
  defaultTheme?: Theme;
  /**
   * Themes a visitor may be randomly shown on each load until they pin one (see
   * module docs). Only `id` + `tokens` are used, so a lightweight `{ id, tokens }`
   * read off disk works as well as a full `Theme`.
   */
  shuffleUntilPinned?: ShuffleTheme[];
}

export function veneer(options: VeneerPluginOptions = {}): Plugin {
  const { defaultTheme, shuffleUntilPinned } = options;
  const shufflePool = shuffleUntilPinned?.map((t) => ({ id: t.id, tokens: t.tokens }));
  return {
    name: 'veneer-anti-flash',
    transformIndexHtml() {
      // head-prepend: run before stylesheets/modules so there is no flash.
      const script = getAntiFlashScript(defaultTheme?.tokens, shufflePool);
      return [{ tag: 'script', children: script, injectTo: 'head-prepend' }];
    },
  };
}

export default veneer;
