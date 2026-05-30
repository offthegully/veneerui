/**
 * Shared project file walker for `doctor` and `migrate`. Recursively collects
 * files under a start dir whose basename the caller accepts, skipping the usual
 * build/vendor directories and dotfolders. Pure-ish: reads the fs, returns text.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface SourceFile {
  /** Path relative to `root`, for display. */
  path: string;
  text: string;
}

const SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'build', 'out', 'coverage', '.turbo', '.vercel',
]);

/** Code files worth scanning/migrating — excludes declarations and tests. */
export const isSourceCode = (name: string): boolean =>
  /\.(?:tsx|jsx|ts|js|mts|cts)$/.test(name) && !name.endsWith('.d.ts') && !/\.test\.[tj]sx?$/.test(name);

export function collectFiles(
  root: string,
  startDir: string,
  accept: (name: string) => boolean,
): SourceFile[] {
  const acc: SourceFile[] = [];
  const recurse = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const abs = join(dir, name);
      let isDir = false;
      try {
        isDir = statSync(abs).isDirectory();
      } catch {
        continue;
      }
      if (isDir) {
        if (!SKIP_DIRS.has(name) && !name.startsWith('.')) recurse(abs);
      } else if (accept(name)) {
        try {
          acc.push({ path: relative(root, abs), text: readFileSync(abs, 'utf8') });
        } catch {
          /* unreadable — skip */
        }
      }
    }
  };
  recurse(startDir);
  return acc;
}
