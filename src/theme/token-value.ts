/** Resolve a token's effective value for a theme, falling back to the schema default. */
import { TOKEN_BY_NAME } from './schema';
import type { Theme } from './types';

export function tokenValue(theme: Theme, name: string): string {
  return theme.tokens[name] ?? TOKEN_BY_NAME.get(name)?.default ?? '';
}
