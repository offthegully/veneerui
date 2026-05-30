import { describe, expect, it } from 'vitest';
import { withClientDirective } from './add';
import { readComponentSource, loadManifest } from './registry';

const HOOK_COMPONENT = "/** x */\nimport { useState } from 'react';\nexport function X() { return null; }";

describe('withClientDirective', () => {
  it('prepends the directive for a Next target that uses hooks', () => {
    const out = withClientDirective(HOOK_COMPONENT, 'next');
    expect(out.startsWith("'use client';\n\n")).toBe(true);
    expect(out).toContain(HOOK_COMPONENT);
  });

  it('leaves Vite (and other non-RSC) copies pristine', () => {
    expect(withClientDirective(HOOK_COMPONENT, 'vite')).toBe(HOOK_COMPONENT);
    expect(withClientDirective(HOOK_COMPONENT, 'unknown')).toBe(HOOK_COMPONENT);
  });

  it('does not add it to a hookless (server-safe) component, even for Next', () => {
    const serverSafe = '/** y */\nexport function Y() { return null; }';
    expect(withClientDirective(serverSafe, 'next')).toBe(serverSafe);
  });

  it('is idempotent — never double-adds', () => {
    const once = withClientDirective(HOOK_COMPONENT, 'next');
    expect(withClientDirective(once, 'next')).toBe(once);
  });

  it('makes every real registry component a client component under Next', () => {
    for (const c of loadManifest()) {
      const src = readComponentSource(c.file);
      // The shipped components all use useTheme, so all get the directive on Next.
      expect(withClientDirective(src, 'next').startsWith("'use client';")).toBe(true);
    }
  });
});
