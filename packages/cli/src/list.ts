/** `veneer list` — show the copy-in components available to `veneer add`. */
import { loadManifest } from './registry';

export function runList(log: (line: string) => void = console.log): void {
  const components = loadManifest();
  log('Components you can copy in with `veneer add <name>`:\n');
  for (const c of components) {
    const deps = c.dependencies.length ? `  (also adds: ${c.dependencies.join(', ')})` : '';
    log(`  ${c.name.padEnd(13)} ${c.description}${deps}`);
  }
}
