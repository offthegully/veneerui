/**
 * `@offthegully/veneerui/vite` — a Vite plugin that injects the anti-flash script into
 * index.html, so a consumer never has to hand-edit their HTML. Add it to
 * `plugins` in vite.config and the saved theme applies before first paint.
 *
 * Pass `{ defaultTheme }` to also kill the cold-load flash on a first-ever
 * visit — use the same theme you pass to `<ThemeProvider defaultThemeId>`.
 */
import type { Plugin } from 'vite';
import type { Theme } from './types';
import { getAntiFlashScript } from './anti-flash';

export interface VeneerPluginOptions {
  /** The app's default theme; its tokens are applied before first paint when nothing is saved yet. */
  defaultTheme?: Theme;
}

export function veneer(options: VeneerPluginOptions = {}): Plugin {
  const { defaultTheme } = options;
  return {
    name: 'veneer-anti-flash',
    transformIndexHtml() {
      // head-prepend: run before stylesheets/modules so there is no flash.
      const script = getAntiFlashScript(defaultTheme?.tokens);
      return [{ tag: 'script', children: script, injectTo: 'head-prepend' }];
    },
  };
}

export default veneer;
