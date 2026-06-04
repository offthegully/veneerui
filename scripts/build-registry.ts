/**
 * Generates the `veneerui` CLI's copy-in registry from the playground's component
 * source, so the components a consumer copies in are byte-for-byte the ones the
 * live demo runs — they can never drift. Run via `npm run gen:registry`.
 *
 * Each registry entry is the verbatim .tsx plus a manifest describing it:
 *   - name          the slug used in `veneerui add <name>`
 *   - file          the filename written into the consumer's components dir
 *   - description   shown by `veneerui list`
 *   - dependencies  other registry slugs it imports (inferred from `./Sibling`
 *                   imports), so `add` can pull them in transitively
 *
 * The components already import their logic from `@offthegully/veneerui`; only sibling
 * imports stay relative, which is exactly what we want when copying them into a
 * consumer's project.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'apps/playground/src/components');
// Canonical home of the registry is setup-core (where registry.ts reads it from);
// the build copies it into the `veneerui` CLI and `create-veneerui` packages.
const OUT = join(root, 'packages/setup-core/registry');

/** Filename → registry slug + human description. The curated public surface. */
const CATALOG: Record<string, { slug: string; description: string }> = {
  'ThemeSwitcher.tsx': { slug: 'switcher', description: 'Dropdown to switch and manage themes (opens the import and gallery panels).' },
  'ImportPanel.tsx': { slug: 'import-panel', description: 'Drop / paste-URL modal that validates and previews a theme.' },
  'GalleryPanel.tsx': { slug: 'gallery-panel', description: 'Modal grid that previews every available theme and applies one on click.' },
  'PreviewBanner.tsx': { slug: 'banner', description: 'Sticky banner shown while previewing an unsaved imported theme.' },
  'ThemeShowcase.tsx': { slug: 'showcase', description: 'Demo surface exercising the full token set — handy reference.' },
};

const slugByFile = new Map(Object.entries(CATALOG).map(([file, { slug }]) => [file, slug]));

/** Infer registry dependencies from `from './Something'` relative imports. */
function inferDeps(source: string): string[] {
  const deps = new Set<string>();
  const re = /from\s+['"]\.\/([A-Za-z0-9_-]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const slug = slugByFile.get(`${m[1]}.tsx`);
    if (slug) deps.add(slug);
  }
  return [...deps];
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const components = [];
for (const file of readdirSync(SRC).sort()) {
  const meta = CATALOG[file];
  if (!meta) continue; // only ship curated components
  const source = readFileSync(join(SRC, file), 'utf8');
  writeFileSync(join(OUT, file), source);
  components.push({
    name: meta.slug,
    file,
    description: meta.description,
    dependencies: inferDeps(source),
  });
  console.log(`  registry: ${meta.slug} (${file})`);
}

const manifest = { components };
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Done — ${components.length} components → packages/setup-core/registry/`);
