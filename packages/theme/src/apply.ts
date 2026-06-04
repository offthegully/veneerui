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
 * Custom colors (the open `color-x-*` namespace) aren't in the schema, so they get
 * a second pass: clear any `--color-x-*` left over from the previous theme (read
 * straight off the element's inline style, since we can't enumerate an open
 * namespace), then set the active theme's. Without this, custom colors never paint
 * after hydration and would leak across theme switches.
 *
 * Inline styles on documentElement outrank any stylesheet `:root` rule, so these
 * win over the generated defaults regardless of stylesheet load order. This is
 * also exactly what the synchronous anti-flash script in index.html does for the
 * persisted theme before React mounts — keep the two in sync (the anti-flash loop
 * iterates the theme's own keys, so it already covers `color-x-*`).
 */
import { CUSTOM_COLOR_PREFIX, TOKEN_SCHEMA } from './schema';
import type { Theme } from './types';

const CUSTOM_PROP_PREFIX = `--${CUSTOM_COLOR_PREFIX}`; // "--color-x-"

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  const { style } = root;
  for (const { name } of TOKEN_SCHEMA) {
    const value = theme.tokens[name];
    if (value != null) style.setProperty(`--${name}`, value);
    else style.removeProperty(`--${name}`);
  }
  // Open custom-color namespace. Collect stale props first (removing while
  // iterating shifts indices), then clear, then set the active theme's.
  const stale: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const prop = style.item(i);
    if (prop.startsWith(CUSTOM_PROP_PREFIX) && theme.tokens[prop.slice(2)] == null) stale.push(prop);
  }
  for (const prop of stale) style.removeProperty(prop);
  for (const [key, value] of Object.entries(theme.tokens)) {
    if (value != null && key.startsWith(CUSTOM_COLOR_PREFIX)) style.setProperty(`--${key}`, value);
  }
}

/**
 * Merge a base theme's custom colors into `theme` as fallbacks (base ∪ active,
 * active wins). This is what preserves the "any theme skins any UI" guarantee for
 * the open namespace: the app's base theme *declares* the custom palette, other
 * themes *may* recolor it, and a theme that omits one can't leave it undefined.
 *
 * Pure and allocation-free when there's nothing to merge — returns the SAME object
 * so callers can use it as a stable effect dependency. Only `color-x-*` keys are
 * inherited; schema tokens already have a CSS floor via tokens.generated.css.
 */
export function withCustomColorFallback(theme: Theme, base: Theme | undefined): Theme {
  if (!base || base.id === theme.id) return theme;
  let merged: Record<string, string> | undefined;
  for (const [key, value] of Object.entries(base.tokens)) {
    if (key.startsWith(CUSTOM_COLOR_PREFIX) && theme.tokens[key] == null) {
      (merged ??= { ...theme.tokens })[key] = value;
    }
  }
  return merged ? { ...theme, tokens: merged } : theme;
}
