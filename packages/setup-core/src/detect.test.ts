import { describe, expect, it } from 'vitest';
import { frameworkFromDeps } from './detect';

describe('frameworkFromDeps', () => {
  it('detects Next', () => {
    expect(frameworkFromDeps({ dependencies: { next: '15.0.0', react: '19' } })).toBe('next');
  });

  it('detects Vite (by vite or a react plugin) — but only with react present', () => {
    expect(frameworkFromDeps({ dependencies: { react: '19' }, devDependencies: { vite: '8' } })).toBe('vite');
    expect(frameworkFromDeps({ dependencies: { react: '19' }, devDependencies: { '@vitejs/plugin-react': '6' } })).toBe('vite');
    expect(frameworkFromDeps({ dependencies: { react: '19' }, devDependencies: { '@vitejs/plugin-react-swc': '4' } })).toBe('vite');
  });

  it('vite without react is NOT the Vite + React profile (Vue apps, vitest-only repos)', () => {
    // The profile's wiring + snippets are React-shaped; matching a Vue/Svelte app
    // (or a repo that has vite only for vitest) would confidently patch the wrong project.
    expect(frameworkFromDeps({ devDependencies: { vite: '8' } })).toBe('unknown');
    expect(frameworkFromDeps({ dependencies: { vue: '3' }, devDependencies: { vite: '8' } })).toBe('unknown');
  });

  it('prefers Next when both are present', () => {
    expect(frameworkFromDeps({ dependencies: { next: '15' }, devDependencies: { vite: '8' } })).toBe('next');
  });

  it('returns unknown when neither is present', () => {
    expect(frameworkFromDeps({ dependencies: { react: '19' } })).toBe('unknown');
    expect(frameworkFromDeps({})).toBe('unknown');
  });

  it('detects React Router 7 by its framework plugin (@react-router/dev)', () => {
    expect(
      frameworkFromDeps({ devDependencies: { '@react-router/dev': '7', vite: '8' } }),
    ).toBe('react-router');
  });

  it('an RR7 app depends on Vite too, but the dev plugin wins over the generic Vite SPA', () => {
    // precedence: a more specific framework must beat the catch-all `vite` profile.
    expect(
      frameworkFromDeps({
        dependencies: { 'react-router': '7' },
        devDependencies: { '@react-router/dev': '7', vite: '8' },
      }),
    ).toBe('react-router');
  });

  it('plain Vite + the react-router *library* (no dev plugin) stays vite', () => {
    expect(
      frameworkFromDeps({ dependencies: { react: '19', 'react-router-dom': '7' }, devDependencies: { vite: '8' } }),
    ).toBe('vite');
  });

  it('detects TanStack Start (also Vite-based — its plugin wins over the generic SPA)', () => {
    expect(
      frameworkFromDeps({ dependencies: { '@tanstack/react-start': '1' }, devDependencies: { vite: '8' } }),
    ).toBe('tanstack-start');
  });
});
