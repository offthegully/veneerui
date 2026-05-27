/**
 * `@veneer/theme/vite` — a Vite plugin that injects the anti-flash script into
 * index.html, so a consumer never has to hand-edit their HTML. Add it to
 * `plugins` in vite.config and the saved theme applies before first paint.
 */
import type { Plugin } from 'vite';
import { getAntiFlashScript } from './anti-flash';

export function veneer(): Plugin {
  return {
    name: 'veneer-anti-flash',
    transformIndexHtml() {
      // head-prepend: run before stylesheets/modules so there is no flash.
      return [{ tag: 'script', children: getAntiFlashScript(), injectTo: 'head-prepend' }];
    },
  };
}

export default veneer;
