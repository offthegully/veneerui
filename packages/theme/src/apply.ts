/**
 * applyTheme — push a theme's tokens onto the DOM.
 *
 * Sets `--<token>` as an inline custom property on the root element for every
 * token the theme defines, and *removes* the inline property for every token it
 * doesn't — letting the `:root` / `@theme` defaults (tokens.generated.css) take
 * over. Iterating the full schema (not just the theme's keys) is what makes
 * switching FROM a heavy theme back to a sparse one work: the heavy theme's
 * leftover overrides get cleared.
 *
 * Inline styles on documentElement outrank any stylesheet `:root` rule, so these
 * win over the generated defaults regardless of stylesheet load order. This is
 * also exactly what the synchronous anti-flash script in index.html does for the
 * persisted theme before React mounts — keep the two in sync.
 */
import { TOKEN_SCHEMA } from './schema';
import type { Theme } from './types';

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  const { style } = root;
  for (const { name } of TOKEN_SCHEMA) {
    const value = theme.tokens[name];
    if (value != null) style.setProperty(`--${name}`, value);
    else style.removeProperty(`--${name}`);
  }
}
