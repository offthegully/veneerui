/**
 * Copy the canonical setup assets — the copy-in component `registry/` and the
 * `assets/agent-guide.md` — from `@veneerui/setup-core` into a consumer package
 * that bundles setup-core (the `veneerui` CLI and the `create-veneerui`
 * scaffolder). Both read these at runtime relative to their own bundled file, so
 * each shipped package needs its own copy; setup-core is the single source the
 * generator writes to (`npm run gen:registry`).
 *
 * Usage: tsx scripts/sync-setup-assets.ts <target-package-dir...>
 *   e.g. tsx scripts/sync-setup-assets.ts packages/cli packages/create-veneerui
 */
import { cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'packages/setup-core');

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('sync-setup-assets: pass at least one target package dir');
  process.exit(1);
}

for (const rel of targets) {
  const dest = join(root, rel);
  for (const dir of ['registry', 'assets']) {
    const from = join(SRC, dir);
    const to = join(dest, dir);
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true });
  }
  console.log(`  synced registry/ + assets/ → ${rel}`);
}
