/**
 * @offthegully/veneerui — public API.
 *
 * The runtime promoted to a package boundary: provider + hook, the DOM apply
 * step, the isomorphic validator (browser value-checker only — the Node one
 * lives at `@offthegully/veneerui/node`), the token schema, the built-in
 * themes, and the anti-flash helper. Tokens ship separately as
 * `@offthegully/veneerui/tokens.css`; the Vite anti-flash plugin as `@offthegully/veneerui/vite`.
 */
export { ThemeProvider } from './ThemeProvider';
export { useTheme, type ThemeContextValue } from './theme-context';
export { applyTheme } from './apply';
export { tokenValue } from './token-value';

export { validateTheme, type ValidationError, type ValidationResult } from './validate';
export { browserCheckValue } from './value-check-browser';
export type { ValueChecker } from './value-check';

export {
  TOKEN_SCHEMA,
  TOKEN_BY_NAME,
  ALLOWED_FONT_FAMILIES,
  CUSTOM_COLOR_PREFIX,
  CUSTOM_COLOR_RE,
  MAX_CUSTOM_COLORS,
  isCustomColorName,
} from './schema';
export { BUILTIN_THEMES, BUILTIN_IDS, DEFAULT_THEME_ID } from './builtin';
export { normalizeAuthoredTheme, type AuthoredTheme } from './authored-theme';
export { defineTheme, type DefineThemeInput } from './define-theme';

export { getAntiFlashScript } from './anti-flash';

export { SCHEMA_VERSION } from './types';
export type { Theme, ThemeLibrary, TokenDef, TokenType, TokenBridge } from './types';
