/**
 * @veneer/theme — public API.
 *
 * The runtime promoted to a package boundary: provider + hook, the DOM apply
 * step, the isomorphic validator (browser value-checker only — the Node one
 * lives at `@veneer/theme/node`), the import pipeline, the token schema, the
 * built-in themes, and the anti-flash helper. Tokens ship separately as
 * `@veneer/theme/tokens.css`; the Vite anti-flash plugin as `@veneer/theme/vite`.
 */
export { ThemeProvider } from './ThemeProvider';
export { useTheme, type ThemeContextValue } from './theme-context';
export { applyTheme } from './apply';
export { tokenValue } from './token-value';

export { validateTheme, type ValidationError, type ValidationResult } from './validate';
export { browserCheckValue } from './value-check-browser';
export type { ValueChecker } from './value-check';

export {
  parseAndValidate,
  fetchTheme,
  isFetchableUrl,
  type ImportOutcome,
  type Origin,
} from './import-theme';

export { TOKEN_SCHEMA, TOKEN_BY_NAME, ALLOWED_FONT_FAMILIES } from './schema';
export { BUILTIN_THEMES, BUILTIN_IDS, DEFAULT_THEME_ID } from './builtin';

export { getAntiFlashScript } from './anti-flash';

export { SCHEMA_VERSION } from './types';
export type { Theme, ThemeLibrary, TokenDef, TokenType, TokenBridge } from './types';
