/**
 * `veneer add <component…>` — copy registry components (and their registry deps)
 * into the consumer's project, shadcn-style. The components import their logic
 * from `@veneer/theme`; only sibling components stay relative, so they land
 * working and the consumer owns/restyles the markup.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { detect } from './detect';
import { loadManifest, readComponentSource, resolveWithDeps } from './registry';

export interface AddOptions {
  root: string;
  dir?: string;
  force?: boolean;
  dryRun?: boolean;
  log?: (line: string) => void;
}

export function runAdd(names: string[], opts: AddOptions): void {
  const log = opts.log ?? console.log;
  if (names.length === 0) {
    throw new Error('specify at least one component, e.g. `veneer add switcher`');
  }

  const components = loadManifest();
  const resolved = resolveWithDeps(names, components);

  const targetRel = opts.dir ?? detect(opts.root).componentsDir;
  const targetAbs = join(opts.root, targetRel);
  if (!opts.dryRun) mkdirSync(targetAbs, { recursive: true });

  const extra = resolved.filter((c) => !names.includes(c.name));
  if (extra.length) log(`Pulling in dependencies: ${extra.map((c) => c.name).join(', ')}`);

  for (const c of resolved) {
    const destRel = `${targetRel}/${c.file}`;
    const destAbs = join(targetAbs, c.file);
    if (existsSync(destAbs) && !opts.force) {
      log(`• skip  ${destRel} (exists — pass --force to overwrite)`);
      continue;
    }
    if (opts.dryRun) {
      log(`• would write  ${destRel}`);
      continue;
    }
    writeFileSync(destAbs, readComponentSource(c.file));
    log(`✓ ${destRel}`);
  }

  log('\nThese import from "@veneer/theme" — ensure it is installed (`npm i @veneer/theme`).');
}
