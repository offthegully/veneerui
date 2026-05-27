/**
 * The playground's app-owned theme set.
 *
 * The gallery themes (`gallery/themes/<slug>/theme.json`) are the canonical
 * example set, so we load them straight from the gallery at build time — the same
 * source the gallery test validates — rather than re-authoring copies. To those we
 * prepend the package's two neutral defaults (`default-light`, `default-dark`),
 * which have no gallery equivalent and whose ids are referenced by storage and the
 * anti-flash path.
 *
 * `default-light` stays the default: it authors only the three required tokens, so
 * the synchronous cold-flash path (which falls back to the CSS `:root` schema
 * defaults) matches it without any extra wiring.
 *
 * Where a gallery slug reuses a package built-in id (brutalist / editorial /
 * high-contrast), the gallery version wins — it's the fuller, canonical authoring.
 * The result is one entry per id; passed to <ThemeProvider themes={...}> they
 * become the non-deletable app tier.
 */
import { BUILTIN_THEMES, SCHEMA_VERSION, type Theme } from '@veneer/theme';

/** Authored gallery JSON, before app bookkeeping. Mirrors the on-disk theme.json. */
interface GallerySource {
  name: string;
  description?: string;
  author?: { id: string; name: string };
  version?: string;
  schemaVersion?: number;
  tags?: string[];
  license?: string;
  tokens: Record<string, string>;
}

// Read every gallery theme.json at transform time (no Node fs) — same glob the
// gallery test uses, so the two can never see a different set.
const galleryModules = import.meta.glob<GallerySource>('../../../gallery/themes/*/theme.json', {
  import: 'default',
  eager: true,
});

const FALLBACK_AUTHOR = { id: 'veneer', name: 'Veneer Team' } as const;

/** slug = the directory name, e.g. ".../themes/editorial/theme.json" → "editorial". */
function slugOf(path: string): string {
  return path.split('/').slice(-2, -1)[0];
}

function normalizeGallery(slug: string, src: GallerySource): Theme {
  return {
    id: slug,
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

/** Deliberate gallery-panel order: light/neutral → expressive → dark/effect. */
const GALLERY_ORDER = [
  'sharp-minimalist',
  'editorial',
  'warm-library',
  'sunset-paper',
  'monospaced',
  'neumorphic',
  'high-contrast',
  'brutalist',
  'windows-95',
  'glassmorphic',
  'terminal',
  'neon-arcade',
];

const galleryThemes: Theme[] = Object.entries(galleryModules)
  .map(([path, src]) => normalizeGallery(slugOf(path), src))
  // Stable, intentional ordering independent of glob/filesystem order.
  .sort((a, b) => GALLERY_ORDER.indexOf(a.id) - GALLERY_ORDER.indexOf(b.id));

const packageDefault = (id: string): Theme | undefined => BUILTIN_THEMES.find((t) => t.id === id);

/** The two neutral package defaults that lead the list (skipped if ever missing). */
const defaults = ['default-light', 'default-dark']
  .map(packageDefault)
  .filter((t): t is Theme => t != null);

// Dedup by id; the package defaults lead, gallery themes win any id collision.
const byId = new Map<string, Theme>();
for (const t of defaults) byId.set(t.id, t);
for (const t of galleryThemes) byId.set(t.id, t);

/**
 * The full app theme set: 2 package defaults + 12 gallery themes = 14. This is
 * the whole *library* — every entry shows in the "Browse gallery" panel and can
 * be enabled. Module-level constant so the ThemeProvider seed is stable.
 */
export const APP_THEMES: Theme[] = [...byId.values()];

/** Applied on a visitor's first load (and the safe fallback). */
export const APP_DEFAULT_THEME_ID = 'default-light';

/**
 * The curated set the switcher shows on a first load — eight solid themes that
 * span the axes (clean, serif, warm, mono, structural, dark) without overwhelming.
 * The other six stay in the library and remain one click away in the gallery
 * panel; a returning visitor's own enabled set is preserved. Order here is the
 * switcher order: neutral defaults → light/expressive → dark.
 */
export const APP_ENABLED_THEME_IDS = [
  'default-light',
  'default-dark',
  'sharp-minimalist',
  'editorial',
  'warm-library',
  'monospaced',
  'brutalist',
  'terminal',
];
