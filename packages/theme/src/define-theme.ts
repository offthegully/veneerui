/**
 * defineTheme — the public authoring helper for app-owned themes.
 *
 * A developer adopting Veneer ships their own theme set through
 * `<ThemeProvider themes={...}>`. Authoring a full `Theme` by hand is verbose
 * (id, author, version, schemaVersion, source, …), so this fills in the
 * app-owned bookkeeping and lets the caller write only the meaningful slice —
 * the same split the private `builtin()` helper uses for the shipped demos
 * (see ./builtin). `source: 'builtin'` puts these themes in the app-owned tier,
 * which storage.ts re-seeds from live definitions and the provider treats as
 * non-deletable.
 */
import { SCHEMA_VERSION, type Theme } from './types';

/** The authored slice of a theme — everything but the app-owned bookkeeping. */
export interface DefineThemeInput {
  /** Stable id. A persisted `currentId` points at this, so don't rename casually. */
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  /** Token overrides; gaps fall back to the schema defaults at apply time. */
  tokens: Record<string, string>;
  /** Defaults to a neutral app author; override to credit yourself. */
  author?: { id: string; name: string };
  /** Semver; defaults to '1.0.0'. */
  version?: string;
  license?: string;
}

const DEFAULT_AUTHOR = { id: 'app', name: 'App' } as const;

/** Build a complete, app-owned `Theme` from its authored slice. */
export function defineTheme(input: DefineThemeInput): Theme {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    author: input.author ?? { ...DEFAULT_AUTHOR },
    version: input.version ?? '1.0.0',
    schemaVersion: SCHEMA_VERSION,
    tags: input.tags,
    license: input.license,
    tokens: input.tokens,
    source: 'builtin',
  };
}
