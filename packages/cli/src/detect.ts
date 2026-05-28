/**
 * Project detection. Figures out whether the consumer's project is Vite or Next
 * and locates the files `init` needs to touch (global stylesheet, vite config,
 * entry). The classification step is pure so it can be unit-tested; file
 * discovery uses the real fs against a given root.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Framework = 'next' | 'vite' | 'unknown';

export interface PackageJsonish {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface Detection {
  framework: Framework;
  root: string;
  hasVeneerTheme: boolean;
  hasTailwind: boolean;
  viteConfigPath?: string;
  globalCssPath?: string;
  entryPath?: string;
  componentsDir: string;
}

/** Pure: classify a parsed package.json by its dependency set. */
export function frameworkFromDeps(pkg: PackageJsonish): Framework {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps['next']) return 'next';
  if (deps['vite'] || deps['@vitejs/plugin-react']) return 'vite';
  return 'unknown';
}

const VITE_CONFIGS = ['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs'];
const VITE_CSS = ['src/index.css', 'src/main.css', 'src/app.css', 'src/styles/index.css', 'src/styles/globals.css'];
const NEXT_CSS = ['app/globals.css', 'src/app/globals.css', 'styles/globals.css', 'app/global.css'];
const VITE_ENTRY = ['src/main.tsx', 'src/main.jsx', 'src/index.tsx'];
const NEXT_ENTRY = ['app/layout.tsx', 'src/app/layout.tsx', 'app/layout.jsx'];

function firstExisting(root: string, candidates: string[]): string | undefined {
  return candidates.find((c) => existsSync(join(root, c)));
}

/** Prefer a stylesheet that imports tailwind; else the first that exists. */
function findGlobalCss(root: string, candidates: string[]): string | undefined {
  for (const c of candidates) {
    const abs = join(root, c);
    if (existsSync(abs)) {
      try {
        if (/tailwindcss/.test(readFileSync(abs, 'utf8'))) return c;
      } catch {
        /* unreadable — ignore */
      }
    }
  }
  return firstExisting(root, candidates);
}

export function detect(root: string): Detection {
  const pkgPath = join(root, 'package.json');
  let pkg: PackageJsonish = {};
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as PackageJsonish;
    } catch {
      /* malformed package.json — treat as empty */
    }
  }
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const framework = frameworkFromDeps(pkg);

  const cssCandidates = framework === 'next' ? NEXT_CSS : VITE_CSS;
  const entryCandidates = framework === 'next' ? NEXT_ENTRY : VITE_ENTRY;
  const usesSrcDir = existsSync(join(root, 'src'));

  return {
    framework,
    root,
    hasVeneerTheme: '@offthegully/veneerui' in allDeps,
    hasTailwind: 'tailwindcss' in allDeps,
    viteConfigPath: framework === 'vite' ? firstExisting(root, VITE_CONFIGS) : undefined,
    globalCssPath: findGlobalCss(root, cssCandidates),
    entryPath: firstExisting(root, entryCandidates),
    componentsDir: usesSrcDir ? 'src/components' : 'components',
  };
}
