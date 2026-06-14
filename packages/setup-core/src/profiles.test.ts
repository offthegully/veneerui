import { describe, expect, it } from 'vitest';
import { FRAMEWORK_PROFILES, getProfile } from './profiles';

describe('framework registry', () => {
  it('exposes the known web framework profiles', () => {
    expect(FRAMEWORK_PROFILES.map((p) => p.id).sort()).toEqual([
      'next',
      'react-router',
      'tanstack-start',
      'vite',
    ]);
  });

  it('both SSR-on-Vite frameworks (RR7, TanStack Start) share one wiring kind — added as data, not code', () => {
    const ssr = FRAMEWORK_PROFILES.filter((p) => p.wiring === 'ssr-root').map((p) => p.id).sort();
    expect(ssr).toEqual(['react-router', 'tanstack-start']);
    for (const id of ssr) {
      expect(getProfile(id)!.tailwind).toBe('vite-plugin');
      expect(getProfile(id)!.antiFlash).toBe('head-script');
      expect(getProfile(id)!.needsUseClient).toBe(false);
    }
  });

  it('orders the generic Vite SPA last so specific frameworks match first', () => {
    // detect() relies on this: an RR7 app also has `vite`, so `vite` must be the
    // fallback, not an earlier match.
    expect(FRAMEWORK_PROFILES.at(-1)!.id).toBe('vite');
  });

  it('de-conflates the two axes: SSR-on-Vite (RR7) keeps the vite Tailwind pipeline but a head-script anti-flash', () => {
    const rr = getProfile('react-router')!;
    expect(rr.tailwind).toBe('vite-plugin'); // axis A — same as plain Vite
    expect(rr.antiFlash).toBe('head-script'); // axis B — NOT the index.html plugin
    expect(rr.wiring).toBe('ssr-root');

    const vite = getProfile('vite')!;
    expect(vite.tailwind).toBe('vite-plugin');
    expect(vite.antiFlash).toBe('vite-index-html'); // the SPA case the plugin handles
  });

  it('only RSC frameworks need a use-client directive', () => {
    expect(getProfile('next')!.needsUseClient).toBe(true);
    expect(getProfile('vite')!.needsUseClient).toBe(false);
    expect(getProfile('react-router')!.needsUseClient).toBe(false);
  });

  it('getProfile is undefined for unknown / unrecognized ids', () => {
    expect(getProfile('unknown')).toBeUndefined();
    expect(getProfile(undefined)).toBeUndefined();
  });
});
