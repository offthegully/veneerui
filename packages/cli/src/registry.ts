/**
 * Access to the copy-in component registry. The registry ships beside the built
 * CLI (packages/cli/registry, a sibling of dist/), generated from the playground
 * source by scripts/build-registry.ts. `../registry/` resolves correctly both
 * from the bundled dist/cli.js and from src during tests.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface RegistryComponent {
  name: string;
  file: string;
  description: string;
  dependencies: string[];
}

const REGISTRY_DIR = fileURLToPath(new URL('../registry/', import.meta.url));

export function loadManifest(dir: string = REGISTRY_DIR): RegistryComponent[] {
  const raw = readFileSync(join(dir, 'manifest.json'), 'utf8');
  return (JSON.parse(raw) as { components: RegistryComponent[] }).components;
}

export function readComponentSource(file: string, dir: string = REGISTRY_DIR): string {
  return readFileSync(join(dir, file), 'utf8');
}

/** Resolve the requested names plus their transitive registry deps, de-duped. */
export function resolveWithDeps(names: string[], components: RegistryComponent[]): RegistryComponent[] {
  const byName = new Map(components.map((c) => [c.name, c]));
  const out = new Map<string, RegistryComponent>();
  const visit = (name: string) => {
    if (out.has(name)) return;
    const c = byName.get(name);
    if (!c) throw new Error(`unknown component "${name}" (run \`veneerui list\`)`);
    out.set(name, c);
    c.dependencies.forEach(visit);
  };
  names.forEach(visit);
  return [...out.values()];
}
