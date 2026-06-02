/**
 * Vendors the gallery themes into the package's built-in set.
 *
 * `gallery/themes/<slug>/theme.json` is the single source of truth for the
 * shipped themes, but the published `@offthegully/veneerui` package can't reach
 * outside its own directory at build time — so each gallery theme is copied to
 * `packages/theme/src/builtin/<slug>.json`, where `builtin/index.ts` imports it.
 * Without this the two could (and did) silently drift.
 *
 * The two `default-*` built-ins have no gallery equivalent and are authored by
 * hand, so they're left untouched.
 *
 * Run: `npm run gen:builtin` (writes) or `npm run check:builtin` (--check: writes
 * nothing, exits 1 if any built-in is out of date — the CI guard against drift).
 * `build:theme` runs the writing form, so every built/published package is fresh.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const GALLERY = join(root, 'gallery/themes');
const OUT = join(root, 'packages/theme/src/builtin');
const check = process.argv.includes('--check');

/** Canonical serialization both sides agree on, so the check is a byte compare. */
const serialize = (json: unknown): string => JSON.stringify(json, null, 2) + '\n';

const slugs = readdirSync(GALLERY, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const stale: string[] = [];
for (const slug of slugs) {
  const src = readFileSync(join(GALLERY, slug, 'theme.json'), 'utf8');
  const out = serialize(JSON.parse(src));
  const dest = join(OUT, `${slug}.json`);

  if (check) {
    let current: string | null = null;
    try {
      current = readFileSync(dest, 'utf8');
    } catch {
      current = null;
    }
    if (current !== out) stale.push(slug);
  } else {
    writeFileSync(dest, out);
    console.log(`  builtin: ${slug}.json`);
  }
}

if (check) {
  if (stale.length > 0) {
    console.error(
      `\n✗ ${stale.length} built-in theme(s) out of date with gallery: ${stale.join(', ')}\n` +
        '  Run `npm run gen:builtin` and commit the result.\n',
    );
    process.exit(1);
  }
  console.log(`✓ all ${slugs.length} built-in themes match gallery.`);
} else {
  console.log(`Done — ${slugs.length} themes → packages/theme/src/builtin/.`);
}
