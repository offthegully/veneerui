import { describe, expect, it } from 'vitest';
import { frameworkFromDeps } from './detect';

describe('frameworkFromDeps', () => {
  it('detects Next', () => {
    expect(frameworkFromDeps({ dependencies: { next: '15.0.0', react: '19' } })).toBe('next');
  });

  it('detects Vite (by vite or the react plugin)', () => {
    expect(frameworkFromDeps({ devDependencies: { vite: '8' } })).toBe('vite');
    expect(frameworkFromDeps({ devDependencies: { '@vitejs/plugin-react': '6' } })).toBe('vite');
  });

  it('prefers Next when both are present', () => {
    expect(frameworkFromDeps({ dependencies: { next: '15' }, devDependencies: { vite: '8' } })).toBe('next');
  });

  it('returns unknown when neither is present', () => {
    expect(frameworkFromDeps({ dependencies: { react: '19' } })).toBe('unknown');
    expect(frameworkFromDeps({})).toBe('unknown');
  });
});
