/**
 * `@veneer/theme/vite` — a Vite plugin that injects the anti-flash script into
 * index.html, so a consumer never has to hand-edit their HTML. Add it to
 * `plugins` in vite.config and the saved theme applies before first paint.
 *
 * Pass `{ defaultTheme }` to also kill the cold-load flash on a first-ever
 * visit — use the same theme you pass to `<ThemeProvider defaultThemeId>`.
 *
 * Pass `{ randomizeFirstVisit }` instead to give first-time visitors a *random*
 * theme, picked and applied before first paint (so it's still flash-free) and
 * persisted so it sticks. `pool` is what may be picked; `enabledIds` is the
 * switcher set to seed — line it up with `<ThemeProvider defaultEnabledIds>`.
 */
import type { Plugin } from 'vite';
import type { Theme } from './types';
import { getAntiFlashScript, type FirstVisitTheme } from './anti-flash';

export interface VeneerPluginOptions {
  /** The app's default theme; its tokens are applied before first paint when nothing is saved yet. */
  defaultTheme?: Theme;
  /** Randomize the theme on a first-ever visit (see module docs). */
  randomizeFirstVisit?: {
    /** Themes a first-time visitor may land on, at random (id + tokens is enough). */
    pool: FirstVisitTheme[];
    /** Switcher set to seed alongside the pick (may be wider than `pool`). */
    enabledIds: string[];
  };
}

export function veneer(options: VeneerPluginOptions = {}): Plugin {
  const { defaultTheme, randomizeFirstVisit } = options;
  const firstVisit = randomizeFirstVisit && {
    pool: randomizeFirstVisit.pool.map((t) => ({ id: t.id, tokens: t.tokens })),
    enabledIds: randomizeFirstVisit.enabledIds,
  };
  return {
    name: 'veneer-anti-flash',
    transformIndexHtml() {
      // head-prepend: run before stylesheets/modules so there is no flash.
      const script = getAntiFlashScript(defaultTheme?.tokens, firstVisit);
      return [{ tag: 'script', children: script, injectTo: 'head-prepend' }];
    },
  };
}

export default veneer;
