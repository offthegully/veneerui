/**
 * The authored slice of a theme and the one normalizer that turns it into a full
 * `Theme`. Both the package's built-ins (static JSON imports in `builtin/index.ts`)
 * and the playground's gallery loader (a Vite glob over `gallery/themes/*`) hold
 * the *same* authored shape, so they share this single function instead of each
 * re-implementing the authored→Theme mapping.
 */
import { SCHEMA_VERSION, type Theme } from './types';

/** The authored part of a theme — exactly what a `theme.json` file holds. */
export interface AuthoredTheme {
  name: string;
  description?: string;
  author?: { id: string; name: string };
  version?: string;
  schemaVersion?: number;
  tags?: string[];
  license?: string;
  tokens: Record<string, string>;
}

const FALLBACK_AUTHOR = { id: 'veneer', name: 'Veneer Team' } as const;

/**
 * Wrap an authored theme slice into a full `Theme`, filling the app-owned
 * bookkeeping the JSON omits. The `id` is supplied by the caller — the stable
 * built-in id, or the gallery directory slug — never read from the file. Author,
 * version and schemaVersion fall back when absent; `source` is always 'builtin'
 * (an app-shipped, non-deletable theme, as opposed to an imported/custom one).
 */
export function normalizeAuthoredTheme(id: string, src: AuthoredTheme): Theme {
  return {
    id,
    name: src.name,
    description: src.description,
    author: src.author ?? { ...FALLBACK_AUTHOR },
    version: src.version ?? '1.0.0',
    schemaVersion: src.schemaVersion ?? SCHEMA_VERSION,
    tags: src.tags,
    license: src.license,
    tokens: src.tokens,
    source: 'builtin',
  };
}
