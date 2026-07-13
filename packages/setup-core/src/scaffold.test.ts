import { describe, expect, it } from 'vitest';
import {
  addVeneerDeps,
  buildScaffoldCommand,
  minimalEslintConfig,
  starterPage,
  withEslintLintScript,
} from './scaffold';

describe('buildScaffoldCommand', () => {
  it('delegates Vite to create-vite (react-ts), non-interactive, with -- for npm', () => {
    expect(buildScaffoldCommand('vite', 'npm', 'my-app')).toEqual({
      cmd: 'npm',
      args: ['create', 'vite@latest', 'my-app', '--', '--template', 'react-ts', '--no-interactive'],
    });
    expect(buildScaffoldCommand('vite', 'pnpm', 'my-app')).toEqual({
      cmd: 'pnpm',
      args: ['create', 'vite@latest', 'my-app', '--template', 'react-ts', '--no-interactive'],
    });
  });

  // create-vite v7+ prompts "Install with <pm> and start now?" in a TTY even with
  // `--template`; without this flag it starts a dev server and the user's Ctrl+C
  // kills our process before Veneer is wired. The flag must always be present.
  it('always passes --no-interactive to create-vite', () => {
    for (const pm of ['npm', 'pnpm', 'yarn', 'bun'] as const) {
      expect(buildScaffoldCommand('vite', pm, 'my-app').args).toContain('--no-interactive');
    }
  });

  it('uses a bare tool name for yarn (no @latest)', () => {
    expect(buildScaffoldCommand('vite', 'yarn', 'my-app').args).toEqual([
      'create',
      'vite',
      'my-app',
      '--template',
      'react-ts',
      '--no-interactive',
    ]);
  });

  it('delegates Next to create-next-app with App Router + Tailwind flags', () => {
    const { cmd, args } = buildScaffoldCommand('next', 'npm', 'my-app');
    expect(cmd).toBe('npm');
    expect(args.slice(0, 4)).toEqual(['create', 'next-app@latest', 'my-app', '--']);
    for (const f of ['--ts', '--tailwind', '--app', '--no-src-dir', '--yes', '--use-npm']) {
      expect(args).toContain(f);
    }
  });

  it('selects the matching --use-<pm> for Next', () => {
    expect(buildScaffoldCommand('next', 'pnpm', 'a').args).toContain('--use-pnpm');
    expect(buildScaffoldCommand('next', 'bun', 'a').args).toContain('--use-bun');
  });

  it('delegates React Router to create-react-router, non-interactive, with -- for npm', () => {
    expect(buildScaffoldCommand('react-router', 'npm', 'my-app')).toEqual({
      cmd: 'npm',
      args: ['create', 'react-router@latest', 'my-app', '--', '--yes', '--no-git-init'],
    });
    expect(buildScaffoldCommand('react-router', 'pnpm', 'my-app')).toEqual({
      cmd: 'pnpm',
      args: ['create', 'react-router@latest', 'my-app', '--yes', '--no-git-init'],
    });
  });

  it('uses a bare tool name for yarn on React Router (no @latest)', () => {
    expect(buildScaffoldCommand('react-router', 'yarn', 'a').args.slice(0, 3)).toEqual([
      'create',
      'react-router',
      'a',
    ]);
  });
});

describe('starterPage', () => {
  it('renders a token-driven page using the switcher + showcase', () => {
    const vite = starterPage('vite');
    expect(vite).toContain("from './components/ThemeSwitcher'");
    expect(vite).toContain('export default function App()');
    expect(vite).toContain('bg-surface');
    // no hardcoded colors — everything is a token utility
    expect(vite).not.toMatch(/bg-(?:blue|red|gray|green|black|white)-?\d*/);
  });

  it('uses the @/ alias for Next', () => {
    const next = starterPage('next');
    expect(next).toContain("from '@/components/ThemeSwitcher'");
    expect(next).toContain('export default function Home()');
  });

  it('uses a relative import for React Router (route → app/components)', () => {
    const rr = starterPage('react-router');
    expect(rr).toContain("from '../components/ThemeSwitcher'");
    expect(rr).toContain('export default function Home()');
    expect(rr).toContain('bg-surface');
    expect(rr).not.toMatch(/bg-(?:blue|red|gray|green|black|white)-?\d*/);
  });
});

// The `--no-install` path: nothing runs an installer, so the dependency set is
// recorded in package.json and a later `<pm> install` completes the project.
describe('addVeneerDeps', () => {
  it('records the runtime + Tailwind + the lint gate when the template ships no Tailwind (Vite)', () => {
    const out = addVeneerDeps(
      { dependencies: { react: '^19.0.0' } },
      { bringsTailwind: false, extraDevDeps: ['eslint', 'typescript-eslint'] },
    );
    expect(out.dependencies).toMatchObject({ react: '^19.0.0', '@offthegully/veneerui': 'latest' });
    expect(out.devDependencies).toMatchObject({
      tailwindcss: 'latest',
      '@tailwindcss/vite': 'latest',
      'eslint-plugin-veneer': 'latest',
      eslint: 'latest',
      'typescript-eslint': 'latest',
    });
  });

  it('skips the Tailwind packages when the template brings Tailwind (Next)', () => {
    const out = addVeneerDeps({}, { bringsTailwind: true });
    expect(out.dependencies).toEqual({ '@offthegully/veneerui': 'latest' });
    expect(out.devDependencies).toEqual({ 'eslint-plugin-veneer': 'latest' });
  });

  it('is non-destructive to existing deps and unrelated fields', () => {
    const out = addVeneerDeps(
      { name: 'x', scripts: { dev: 'vite' }, devDependencies: { typescript: '~6.0.2' } },
      { bringsTailwind: true },
    );
    expect(out.name).toBe('x');
    expect(out.scripts).toEqual({ dev: 'vite' });
    expect(out.devDependencies).toMatchObject({ typescript: '~6.0.2' });
  });
});

// The gate for templates that ship no ESLint (React Router; create-vite v8 ships oxlint).
describe('the minimal ESLint gate', () => {
  it('minimalEslintConfig enables the veneer preset and the given ignores', () => {
    const cfg = minimalEslintConfig(['dist/']);
    expect(cfg).toContain("import veneer from 'eslint-plugin-veneer'");
    expect(cfg).toContain('veneer.configs.recommended');
    expect(cfg).toContain("ignores: ['dist/']");
  });

  it('withEslintLintScript: adds, preserves, or chains the lint script', () => {
    // no script at all (React Router) → eslint is the linter
    expect(withEslintLintScript(undefined)).toBe('eslint .');
    // already runs eslint → untouched
    expect(withEslintLintScript('eslint .')).toBe('eslint .');
    // another linter (create-vite v8's oxlint) → keep it AND run the veneer gate
    expect(withEslintLintScript('oxlint')).toBe('oxlint && eslint .');
  });
});
