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
import type { Theme } from '../types';
import { normalizeAuthoredTheme, type AuthoredTheme } from '../authored-theme';
import light from './default-light.json';
import dark from './default-dark.json';
import brutalist from './brutalist.json';
import editorial from './editorial.json';
import glassmorphic from './glassmorphic.json';
import highContrast from './high-contrast.json';
import monospaced from './monospaced.json';
import neonArcade from './neon-arcade.json';
import neumorphic from './neumorphic.json';
import sunsetPaper from './sunset-paper.json';
import terminal from './terminal.json';
import warmLibrary from './warm-library.json';
import windows95 from './windows-95.json';

// The default-* files are authored by hand; the rest are generated from
// gallery/themes/<slug>/theme.json by scripts/gen-builtin.ts (gallery is the
// single source of truth). All share the authored shape, so one normalizer wraps
// them — see ../authored-theme.
const builtin = (id: string, src: AuthoredTheme): Theme => normalizeAuthoredTheme(id, src);

/** The id applied on first run and the safe fallback when state is malformed. */
export const DEFAULT_THEME_ID = 'default-light';

/** Order here is the order shown in the switcher by default. */
export const BUILTIN_THEMES: Theme[] = [
  builtin(DEFAULT_THEME_ID, light),
  builtin('default-dark', dark),
  builtin('brutalist', brutalist),
  builtin('editorial', editorial),
  builtin('glassmorphic', glassmorphic),
  builtin('high-contrast', highContrast),
  builtin('monospaced', monospaced),
  builtin('neon-arcade', neonArcade),
  builtin('neumorphic', neumorphic),
  builtin('sunset-paper', sunsetPaper),
  builtin('terminal', terminal),
  builtin('warm-library', warmLibrary),
  builtin('windows-95', windows95),
];

/** Built-in ids can't be deleted from the library. */
export const BUILTIN_IDS: ReadonlySet<string> = new Set(BUILTIN_THEMES.map((t) => t.id));
