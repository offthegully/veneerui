/**
 * Conformance — the Phase-2 guarantee that switching themes re-skins the *whole*
 * UI, with no hardcoded islands a theme can't reach.
 *
 * Two halves, because "no islands" has two failure modes:
 *
 *  1. Source scan — the rendered UI (`.tsx`) must express color only through
 *     theme tokens. We can't compute the CSS-variable cascade in Node (Tailwind
 *     compiles classes at build time and jsdom doesn't resolve custom
 *     properties), so the honest, robust check is static: no palette utilities,
 *     no arbitrary color values, no bare inline-color literals. This shares the
 *     exact detector the `veneer/no-hardcoded-colors` ESLint rule uses, so the
 *     test and the lint rule can never disagree about what counts as an island.
 *
 *  2. Drastic re-skin — applying `high-contrast` must actually drive color AND
 *     structure (border-width, radius, shadow), proving a theme reaches past the
 *     palette. If the UI uses only tokens (half 1) and a drastic theme moves all
 *     of them (half 2), the whole surface re-skins.
 */
import { describe, expect, it } from 'vitest';
import {
  findClassColorViolations,
  findBareColorLiterals,
} from '../eslint-rules/detect-hardcoded-colors.js';
import { applyTheme, BUILTIN_THEMES, type Theme } from '@offthegully/veneerui';

/**
 * Every non-test source file under the playground's src, as raw text — this is
 * the rendered UI (app shell + copied components). Vite's import.meta.glob reads
 * them at transform time, so this needs no Node fs APIs. Keys are paths relative
 * to this file.
 */
function sourceFiles(): { rel: string; text: string }[] {
  const modules = import.meta.glob<string>(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'], {
    query: '?raw',
    import: 'default',
    eager: true,
  });
  return Object.entries(modules).map(([rel, text]) => ({ rel, text }));
}

describe('conformance: no hardcoded islands', () => {
  const files = sourceFiles();

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // Palette + arbitrary-color utilities are class-syntax-specific, so they can't
  // false-positive on schema hex or token logic — scan every source file.
  it('uses no palette or arbitrary-color utilities anywhere in src', () => {
    const offenders = files.flatMap((f) =>
      findClassColorViolations(f.text).map((v) => `${f.rel}: ${v.kind} "${v.value}"`),
    );
    expect(offenders).toEqual([]);
  });

  // Bare hex / color-fn literals only count as islands in rendered markup, where
  // the sole legitimate color source is a token. (Schema token *definitions*
  // live in .ts and legitimately hold hex — they're not the rendered UI.)
  it('uses no bare color literals in rendered UI (.tsx)', () => {
    const offenders = files
      .filter((f) => f.rel.endsWith('.tsx'))
      .flatMap((f) => findBareColorLiterals(f.text).map((v) => `${f.rel}: ${v.kind} "${v.value}"`));
    expect(offenders).toEqual([]);
  });
});

describe('conformance: a drastic theme re-skins color AND structure', () => {
  const byId = (id: string): Theme => {
    const t = BUILTIN_THEMES.find((x) => x.id === id);
    if (!t) throw new Error(`missing built-in: ${id}`);
    return t;
  };

  /** A stand-in for documentElement that records applied custom properties. */
  function recordingRoot() {
    const props = new Map<string, string>();
    const el = {
      style: {
        setProperty: (k: string, v: string) => void props.set(k, v),
        removeProperty: (k: string) => void props.delete(k),
      },
    } as unknown as HTMLElement;
    return { props, el };
  }

  it('high-contrast moves color, border-width, radius, and shadow off their light values', () => {
    const light = recordingRoot();
    const hc = recordingRoot();
    applyTheme(byId('default-light'), light.el);
    applyTheme(byId('high-contrast'), hc.el);

    // Concrete high-contrast values land as inline custom properties.
    expect(hc.props.get('--color-text')).toBe('#000000');
    expect(hc.props.get('--color-primary')).toBe('#0000ee');
    expect(hc.props.get('--border-width-default')).toBe('2px');
    expect(hc.props.get('--radius-md')).toBe('0px');
    expect(hc.props.get('--shadow-card')).toBe('0 0 0 2px #000000');

    // Each axis differs from the light baseline — a re-skin, not a recolor.
    // (default-light sets only the 3 required tokens, so the structural ones are
    // absent there; high-contrast supplying them is itself the difference.)
    for (const token of [
      '--color-text',
      '--color-primary',
      '--color-border',
      '--border-width-default',
      '--radius-md',
      '--shadow-card',
    ]) {
      expect(hc.props.get(token)).not.toBe(light.props.get(token));
    }
  });
});

describe('conformance: the detector actually detects', () => {
  // Guards the guard — a detector that matched nothing would make the scans
  // above pass vacuously.
  it('flags hardcoded islands', () => {
    expect(findClassColorViolations('flex bg-blue-500 p-2').length).toBeGreaterThan(0);
    expect(findClassColorViolations('rounded text-[#fff]').length).toBeGreaterThan(0);
    expect(findBareColorLiterals("color: '#ff0000'").length).toBeGreaterThan(0);
  });

  it('does not flag the sanctioned token escape hatches', () => {
    expect(findClassColorViolations('bg-primary text-text-muted border-border')).toEqual([]);
    expect(findClassColorViolations('bg-[image:var(--gradient-primary)]')).toEqual([]);
    expect(findClassColorViolations('[border-width:var(--border-width-default)]')).toEqual([]);
    expect(findBareColorLiterals('var(--color-primary)')).toEqual([]);
  });
});
