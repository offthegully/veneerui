import { describe, expect, it } from 'vitest';
import {
  buildScaffoldCommand,
  installArgs,
  isPackageManager,
  resolvePm,
  starterPage,
} from './scaffold';

describe('resolvePm', () => {
  it('reads the package manager from npm_config_user_agent', () => {
    expect(resolvePm('pnpm/9.0.0 npm/? node/v20')).toBe('pnpm');
    expect(resolvePm('yarn/1.22.0 npm/?')).toBe('yarn');
    expect(resolvePm('bun/1.1.0')).toBe('bun');
    expect(resolvePm('npm/10.0.0 node/v20')).toBe('npm');
  });

  it('falls back to npm for an unknown or missing agent', () => {
    expect(resolvePm(undefined)).toBe('npm');
    expect(resolvePm('deno/1.0')).toBe('npm');
  });

  it('lets an explicit override win', () => {
    expect(resolvePm('pnpm/9', 'bun')).toBe('bun');
    expect(resolvePm('pnpm/9', 'not-a-pm')).toBe('pnpm');
  });

  it('validates package-manager names', () => {
    expect(isPackageManager('pnpm')).toBe(true);
    expect(isPackageManager('cargo')).toBe(false);
  });
});

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
});

describe('installArgs', () => {
  it('uses `npm install` / `<pm> add`', () => {
    expect(installArgs('npm', ['x'])).toEqual(['install', 'x']);
    expect(installArgs('pnpm', ['x'])).toEqual(['add', 'x']);
    expect(installArgs('yarn', ['x'])).toEqual(['add', 'x']);
    expect(installArgs('bun', ['x'])).toEqual(['add', 'x']);
  });

  it('threads the dev flag per package manager', () => {
    expect(installArgs('npm', ['x'], true)).toEqual(['install', '--save-dev', 'x']);
    expect(installArgs('pnpm', ['x'], true)).toEqual(['add', '-D', 'x']);
    expect(installArgs('bun', ['x'], true)).toEqual(['add', '-d', 'x']);
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
});
