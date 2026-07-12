/**
 * Project detection. Classifies the consumer's project against the framework
 * registry (`profiles.ts`) and locates the files `init` needs to touch (global
 * stylesheet, vite config, entry). The classification step is pure so it can be
 * unit-tested; file discovery uses the real fs against a given root.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FRAMEWORK_PROFILES, getProfile, type FrameworkId } from './profiles';
import { detectPm, type PackageManager } from './pm';

export type Framework = FrameworkId | 'unknown';

export interface PackageJsonish {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface Detection {
  framework: Framework;
  root: string;
  hasVeneerTheme: boolean;
  hasTailwind: boolean;
  /** True when `react` is a dependency — used to gate help for unrecognized frameworks. */
  hasReact: boolean;
  /** True when `eslint-plugin-veneer` is already a dependency. */
  hasEslintPlugin: boolean;
  viteConfigPath?: string;
  globalCssPath?: string;
  entryPath?: string;
  /** The project's ESLint flat config, if one exists — where the lint gate is wired. */
  eslintConfigPath?: string;
  componentsDir: string;
  /** The project's package manager (corepack field → lockfile → npm), so the
   * "we never install, we instruct" output speaks the right dialect. */
  pm: PackageManager;
}

/**
 * Pure: classify a parsed package.json by its dependency set. Iterates the
 * registry in precedence order (specific frameworks before the generic Vite SPA,
 * since e.g. an RR7 app also depends on Vite) and returns the first match.
 */
export function frameworkFromDeps(pkg: PackageJsonish): Framework {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const p of FRAMEWORK_PROFILES) {
    if (p.detectDeps.some((d) => deps[d])) return p.id;
  }
  return 'unknown';
}

const VITE_CONFIGS = ['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs'];
const ESLINT_CONFIGS = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.ts', 'eslint.config.cjs'];

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
  const profile = getProfile(framework);

  // The generic Vite SPA candidates are the sensible default for an unrecognized
  // (but plausibly React + Tailwind) project — that's where init still helps.
  const cssCandidates = profile?.cssCandidates ?? FRAMEWORK_PROFILES.at(-1)!.cssCandidates;
  const entryCandidates = profile?.entryCandidates ?? FRAMEWORK_PROFILES.at(-1)!.entryCandidates;
  const usesSrcDir = existsSync(join(root, 'src'));

  return {
    framework,
    root,
    hasVeneerTheme: '@offthegully/veneerui' in allDeps,
    hasTailwind: 'tailwindcss' in allDeps,
    hasReact: 'react' in allDeps,
    hasEslintPlugin: 'eslint-plugin-veneer' in allDeps,
    // Only the SPA-on-Vite wiring patches the Vite config (for the index.html
    // anti-flash plugin); SSR-on-Vite (RR7) uses a head script instead.
    viteConfigPath: profile?.wiring === 'vite-spa' ? firstExisting(root, VITE_CONFIGS) : undefined,
    globalCssPath: findGlobalCss(root, cssCandidates),
    entryPath: firstExisting(root, entryCandidates),
    eslintConfigPath: firstExisting(root, ESLINT_CONFIGS),
    componentsDir: profile?.componentsDir ?? (usesSrcDir ? 'src/components' : 'components'),
    pm: detectPm(root),
  };
}
