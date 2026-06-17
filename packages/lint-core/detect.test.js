/**
 * Unit tests for the shared island detectors — the raw matchers (no ESLint).
 * The finders are only ever fed class-context strings by the rule (see rule.js),
 * so they make no class-vs-prose guess; these tests pin the regex/fix behavior:
 * per-type shadow validity (the H2 fix), integer-px-only spacing (the H3 fix),
 * and the real v3 opacity set (the L3 fix). Class-context gating is covered by
 * the RuleTester suite in eslint-plugin.
 */
import { describe, it, expect } from 'vitest';
import {
  findClassColorViolations,
  findBakedShadows,
  findIslandSpacing,
  findDeadOpacity,
  SHADOW_SCALES,
} from './detect.js';

const fixes = (arr) => arr.map((v) => v.fix);
const kinds = (arr) => arr.map((v) => v.kind);

describe('findBakedShadows', () => {
  it('flags named shadows (incl. lone — the rule only feeds class strings)', () => {
    expect(findBakedShadows('rounded-lg shadow-md p-4')).toEqual([
      { value: 'shadow-md', index: 11, kind: 'baked-shadow', fix: '[box-shadow:var(--shadow-md)]' },
    ]);
    // No lone-token guard anymore: a bare `shadow-card` reaching the finder is a
    // className island (token-name strings never reach it — see rule.js gating).
    expect(fixes(findBakedShadows('shadow-card'))).toEqual(['[box-shadow:var(--shadow-card)]']);
  });

  it('maps each type to the correct CSS property', () => {
    expect(fixes(findBakedShadows('inset-shadow-sm'))).toEqual(['[box-shadow:var(--inset-shadow-sm)]']);
    expect(fixes(findBakedShadows('text-shadow-glow'))).toEqual(['[text-shadow:var(--text-shadow-glow)]']);
    expect(fixes(findBakedShadows('hover:shadow-lg'))).toEqual(['[box-shadow:var(--shadow-lg)]']);
  });

  it('only matches tokens that exist per type — never autofixes to a nonexistent token (H2)', () => {
    // `xs` is not a shadow token (only `2xs`); inset/text have narrower scales.
    expect(findBakedShadows('shadow-xs')).toEqual([]);
    expect(findBakedShadows('inset-shadow-xl')).toEqual([]);
    expect(findBakedShadows('inset-shadow-card')).toEqual([]);
    expect(findBakedShadows('text-shadow-2xl')).toEqual([]);
    // …but the valid per-type names are caught.
    expect(fixes(findBakedShadows('shadow-2xs'))).toEqual(['[box-shadow:var(--shadow-2xs)]']);
  });

  it('never flags drop-shadow, the escape hatch, shadow-none, color shadows, or the opacity-modifier form', () => {
    expect(findBakedShadows('drop-shadow-lg')).toEqual([]);
    expect(findBakedShadows('[box-shadow:var(--shadow-card)]')).toEqual([]);
    expect(findBakedShadows('[text-shadow:var(--text-shadow-glow)]')).toEqual([]);
    expect(findBakedShadows('shadow-none')).toEqual([]);
    expect(findBakedShadows('shadow-primary')).toEqual([]);
    expect(findBakedShadows('shadow-card/50')).toEqual([]);
  });
});

describe('findIslandSpacing', () => {
  it('converts integer px to the decimal multiplier (base 4px → always on the 0.25 grid)', () => {
    expect(findIslandSpacing('flex p-[18px]')).toEqual([
      { value: 'p-[18px]', index: 5, kind: 'island-spacing', fix: 'p-4.5' },
    ]);
    expect(fixes(findIslandSpacing('p-[1px] gap-[4px] gap-x-[6px] -mt-[8px] space-y-[2px]'))).toEqual([
      'p-0.25',
      'gap-1',
      'gap-x-1.5',
      '-mt-2',
      'space-y-0.5',
    ]);
  });

  it('ignores fractional px (off-grid, no valid class) and non-px units (H3)', () => {
    expect(findIslandSpacing('p-[1.5px] p-[0.5px]')).toEqual([]);
    expect(findIslandSpacing('w-[100vw] max-w-[65ch] min-h-[100dvh] p-4.5')).toEqual([]);
  });
});

describe('findDeadOpacity', () => {
  it('flags the real v3 *-opacity-N utilities (no autofix)', () => {
    expect(findDeadOpacity('bg-opacity-75')).toEqual([
      { value: 'bg-opacity-75', index: 0, kind: 'dead-opacity' },
    ]);
    expect(kinds(findDeadOpacity('text-opacity-50 border-opacity-20 divide-opacity-10'))).toEqual([
      'dead-opacity',
      'dead-opacity',
      'dead-opacity',
    ]);
  });

  it('does not flag prefixes that never had an opacity utility, or the live forms (L3)', () => {
    expect(findDeadOpacity('from-opacity-50 via-opacity-50 to-opacity-50')).toEqual([]);
    expect(findDeadOpacity('opacity-50 bg-primary/75')).toEqual([]);
  });
});

describe('the color detector is unchanged by the island finders', () => {
  it('still flags color islands and passes token utilities', () => {
    expect(findClassColorViolations('flex bg-blue-500').length).toBe(1);
    expect(findClassColorViolations('bg-primary text-text-muted')).toEqual([]);
  });
});

describe('SHADOW_SCALES is the per-type source for detection + fixes', () => {
  it('exposes the three shadow types', () => {
    expect(Object.keys(SHADOW_SCALES).sort()).toEqual(['inset-shadow', 'shadow', 'text-shadow']);
  });
});
