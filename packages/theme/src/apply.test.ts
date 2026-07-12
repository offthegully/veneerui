/**
 * applyTheme / withCustomColorFallback — these run under the node test env, so
 * there's no real DOM. We pass a fake root whose `style` mimics the slice of
 * CSSStyleDeclaration applyTheme uses: setProperty/removeProperty plus the
 * indexed iteration (length + item) it relies on to clear stale custom colors.
 */
import { describe, expect, it } from 'vitest';
import { applyTheme, withCustomColorFallback } from './apply';
import type { Theme } from './types';

function theme(id: string, tokens: Record<string, string>): Theme {
  return { id, name: id, author: { id: '', name: 'test' }, version: '1.0.0', schemaVersion: 1, tokens, source: 'builtin' };
}

/** A minimal element whose `style` tracks inline custom properties in insertion order. */
function fakeRoot() {
  const map = new Map<string, string>();
  const style = {
    setProperty: (k: string, v: string) => void map.set(k, v),
    removeProperty: (k: string) => void map.delete(k),
    getPropertyValue: (k: string) => map.get(k) ?? '',
    item: (i: number) => [...map.keys()][i] ?? '',
    get length() {
      return map.size;
    },
  };
  return { root: { style } as unknown as HTMLElement, map };
}

describe('applyTheme', () => {
  it('sets schema tokens the theme defines', () => {
    const { root, map } = fakeRoot();
    applyTheme(theme('t', { 'color-primary': '#123456' }), root);
    expect(map.get('--color-primary')).toBe('#123456');
  });

  it('writes custom colors as --color-x-* custom properties', () => {
    const { root, map } = fakeRoot();
    applyTheme(theme('t', { 'color-primary': '#123456', 'color-x-gold': '#d4af37' }), root);
    expect(map.get('--color-x-gold')).toBe('#d4af37');
  });

  it('clears a stale custom color when switching to a theme without it (no leak)', () => {
    const { root, map } = fakeRoot();
    applyTheme(theme('a', { 'color-x-gold': '#d4af37' }), root);
    expect(map.has('--color-x-gold')).toBe(true);
    applyTheme(theme('b', { 'color-primary': '#000000' }), root);
    expect(map.has('--color-x-gold')).toBe(false);
  });

  it('replaces the previous theme\'s custom color with the new one on switch', () => {
    const { root, map } = fakeRoot();
    applyTheme(theme('a', { 'color-x-gold': '#d4af37' }), root);
    applyTheme(theme('b', { 'color-x-bronze': '#cd7f32' }), root);
    expect(map.has('--color-x-gold')).toBe(false);
    expect(map.get('--color-x-bronze')).toBe('#cd7f32');
  });

  it('does not touch unrelated inline custom properties when clearing', () => {
    const { root, map } = fakeRoot();
    root.style.setProperty('--app-owned', 'keep');
    applyTheme(theme('a', { 'color-x-gold': '#d4af37' }), root);
    applyTheme(theme('b', { 'color-primary': '#000' }), root);
    expect(map.get('--app-owned')).toBe('keep');
  });
});

describe('withCustomColorFallback', () => {
  const base = theme('base', { 'color-primary': '#fff', 'color-x-gold': '#d4af37', 'color-x-bronze': '#cd7f32' });

  it('inherits custom colors the active theme omits', () => {
    const active = theme('active', { 'color-primary': '#000' });
    const merged = withCustomColorFallback(active, base);
    expect(merged.tokens['color-x-gold']).toBe('#d4af37');
    expect(merged.tokens['color-x-bronze']).toBe('#cd7f32');
  });

  it('lets the active theme override an inherited custom color', () => {
    const active = theme('active', { 'color-x-gold': '#ffd700' });
    const merged = withCustomColorFallback(active, base);
    expect(merged.tokens['color-x-gold']).toBe('#ffd700'); // active wins
    expect(merged.tokens['color-x-bronze']).toBe('#cd7f32'); // base fills the gap
  });

  it('never inherits non-custom (schema) tokens from the base', () => {
    const active = theme('active', {});
    const merged = withCustomColorFallback(active, base);
    expect(merged.tokens['color-primary']).toBeUndefined();
  });

  it('returns the same object reference when there is nothing to merge', () => {
    const active = theme('active', { 'color-x-gold': '#1', 'color-x-bronze': '#2' });
    expect(withCustomColorFallback(active, base)).toBe(active);
  });

  it('returns the same object reference when base is undefined or is the theme itself', () => {
    const active = theme('active', { 'color-primary': '#000' });
    expect(withCustomColorFallback(active, undefined)).toBe(active);
    expect(withCustomColorFallback(base, base)).toBe(base);
  });
});
