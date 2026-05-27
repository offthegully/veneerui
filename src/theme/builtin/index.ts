/**
 * Built-in themes shipped with the app.
 *
 * Each `*.json` file holds only the *authored* part of a theme (name, blurb,
 * tags, token overrides) — the same shape a gallery contributor writes. This
 * module adds the app-owned bookkeeping (stable id, author, version,
 * `source: 'builtin'`) so the rest of the system sees ordinary `Theme` objects.
 *
 * The ids here are stable and referenced by storage/anti-flash logic, so don't
 * rename them casually — a persisted `currentId` points at one of these.
 */
import { SCHEMA_VERSION, type Theme } from '../types';
import light from './default-light.json';
import dark from './default-dark.json';
import highContrast from './high-contrast.json';
import editorial from './editorial.json';
import brutalist from './brutalist.json';

/** The authored slice of a theme, as stored in the JSON files. */
interface BuiltinSource {
  name: string;
  description?: string;
  tags?: string[];
  tokens: Record<string, string>;
}

const AUTHOR = { id: 'veneer', name: 'Veneer' } as const;

const builtin = (id: string, src: BuiltinSource): Theme => ({
  id,
  name: src.name,
  description: src.description,
  author: { ...AUTHOR },
  version: '1.0.0',
  schemaVersion: SCHEMA_VERSION,
  tags: src.tags,
  tokens: src.tokens,
  source: 'builtin',
});

/** The id applied on first run and the safe fallback when state is malformed. */
export const DEFAULT_THEME_ID = 'default-light';

/** Order here is the order shown in the switcher by default. */
export const BUILTIN_THEMES: Theme[] = [
  builtin(DEFAULT_THEME_ID, light),
  builtin('default-dark', dark),
  builtin('high-contrast', highContrast),
  builtin('editorial', editorial),
  builtin('brutalist', brutalist),
];

/** Built-in ids can't be deleted from the library. */
export const BUILTIN_IDS: ReadonlySet<string> = new Set(BUILTIN_THEMES.map((t) => t.id));
