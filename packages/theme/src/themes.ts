/**
 * @offthegully/veneerui/themes — the side-effect-free, server-importable slice.
 *
 * The main entry (`.`) re-exports the provider and `useTheme`, which pull in
 * `theme-context.ts` — and that calls `createContext` at module load. So
 * importing ANYTHING from `@offthegully/veneerui` inside a React Server
 * Component (e.g. computing a default theme in `app/layout.tsx`) crashes with
 * "createContext only works in Client Components".
 *
 * This entry re-exports only the pieces that are pure data + pure functions —
 * `defineTheme`, the built-ins, the token schema, and the types — with NO
 * transitive import of React or the context. Import it from server code:
 *
 *   import { defineTheme, BUILTIN_THEMES, DEFAULT_THEME_ID } from '@offthegully/veneerui/themes'
 *
 * Keep this list free of anything that touches `./theme-context`, `./ThemeProvider`,
 * `./apply`, or `./index` — that's the whole point of the subpath.
 */
export { defineTheme, type DefineThemeInput } from './define-theme';
export { BUILTIN_THEMES, BUILTIN_IDS, DEFAULT_THEME_ID } from './builtin';
export { TOKEN_SCHEMA, TOKEN_BY_NAME, ALLOWED_FONT_FAMILIES } from './schema';
export { SCHEMA_VERSION } from './types';
export type { Theme, ThemeLibrary, TokenDef, TokenType, TokenBridge } from './types';
