/**
 * `veneerui add <component…>` — copy registry components (and their registry deps)
 * into the consumer's project, shadcn-style. The components import their logic
 * from `@offthegully/veneerui`; only sibling components stay relative, so they land
 * working and the consumer owns/restyles the markup.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { detect, type Framework } from './detect';
import { getProfile } from './profiles';
import { loadManifest, readComponentSource, resolveWithDeps } from './registry';

/**
 * Hooks/state that make a component a client component under React Server
 * Components. The registry ships framework-neutral source (no directive); only an
 * RSC compiler (Next) needs `'use client'`, and it's inert everywhere else, so we
 * inject it only for profiles flagged `needsUseClient` — keeping
 * Vite/React-Router/CSR copies pristine.
 */
const CLIENT_HOOK_RE = /\buse(?:Theme|State|Effect|Ref|Id|LayoutEffect|Memo|Callback|Reducer|Context)\b/;

/**
 * Prepend `'use client'` to a copied component for an RSC target if it uses hooks
 * and doesn't already declare a directive. Pure and idempotent.
 */
export function withClientDirective(source: string, framework: Framework): string {
  if (!getProfile(framework)?.needsUseClient) return source;
  if (/^\s*['"]use client['"]/.test(source)) return source;
  if (!CLIENT_HOOK_RE.test(source)) return source;
  return `'use client';\n\n${source}`;
}

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
    throw new Error('specify at least one component, e.g. `veneerui add switcher`');
  }

  const components = loadManifest();
  const resolved = resolveWithDeps(names, components);

  const det = detect(opts.root);
  const targetRel = opts.dir ?? det.componentsDir;
  const targetAbs = join(opts.root, targetRel);
  if (!opts.dryRun) mkdirSync(targetAbs, { recursive: true });

  const extra = resolved.filter((c) => !names.includes(c.name));
  if (extra.length) log(`Pulling in dependencies: ${extra.map((c) => c.name).join(', ')}`);

  let injectedClient = false;
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
    const source = readComponentSource(c.file);
    const out = withClientDirective(source, det.framework);
    if (out !== source) injectedClient = true;
    writeFileSync(destAbs, out);
    log(`✓ ${destRel}`);
  }

  if (injectedClient) log("\nAdded 'use client' for Next — these components use hooks (inert on other setups).");
  log('\nThese import from "@offthegully/veneerui" — ensure it is installed (`npm i @offthegully/veneerui`).');
}
