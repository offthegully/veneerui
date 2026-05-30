import { describe, expect, it } from 'vitest';
import {
  CONVERSIONS,
  DETERMINISTIC,
  applyDeterministic,
  findJudgmentCalls,
  countConversions,
} from './conversions.js';

describe('deterministic conversions round-trip the AGENTS.md gotchas', () => {
  const cases = [
    ['flex shadow-md p-2', 'flex [box-shadow:var(--shadow-md)] p-2'],
    ['shadow-card', '[box-shadow:var(--shadow-card)]'],
    ['inset-shadow-lg', '[box-shadow:var(--inset-shadow-lg)]'],
    ['text-shadow-glow', '[text-shadow:var(--text-shadow-glow)]'],
    ['border p-2', '[border-width:var(--border-width-default)] border-border p-2'],
    ['border-2', '[border-width:var(--border-width-default)] border-border'],
    ['transition duration-200', 'transition duration-[calc(var(--duration-default)*1ms)]'],
  ];
  for (const [input, expected] of cases) {
    it(`${input} → ${expected}`, () => {
      expect(applyDeterministic(input).output).toBe(expected);
    });
  }

  it('reports what it applied', () => {
    const { applied } = applyDeterministic('shadow-md border duration-200');
    expect(applied.map((a) => a.kind).sort()).toEqual(['border-width', 'box-shadow', 'duration']);
  });
});

describe('deterministic conversions are idempotent', () => {
  for (const input of [
    'flex shadow-md p-2',
    'border-2 rounded-md',
    'transition duration-300 ease-default',
    'inset-shadow-sm text-shadow-md',
  ]) {
    it(`twice == once: ${input}`, () => {
      const once = applyDeterministic(input).output;
      const twice = applyDeterministic(once).output;
      expect(twice).toBe(once);
    });
  }
});

describe('does not touch already-correct or unrelated utilities', () => {
  for (const safe of [
    'bg-primary text-text-muted border-border rounded-md',
    '[box-shadow:var(--shadow-card)]',
    'border-t border-primary', // sided / colored borders are left for manual conversion
    'drop-shadow-lg', // the documented exception
    'duration-[calc(var(--duration-default)*1ms)]',
  ]) {
    it(`unchanged: ${safe}`, () => {
      expect(applyDeterministic(safe).output).toBe(safe);
    });
  }
});

describe('judgment calls are flagged, never auto-applied', () => {
  it('opacity is a judgment call (disabled vs overlay)', () => {
    expect(applyDeterministic('opacity-50').output).toBe('opacity-50');
    const flags = findJudgmentCalls('opacity-50');
    expect(flags.map((f) => f.kind)).toContain('opacity');
  });

  it('arbitrary sizes are flagged, not silently rounded', () => {
    expect(applyDeterministic('text-[15px] rounded-[22px]').output).toBe('text-[15px] rounded-[22px]');
    const flags = findJudgmentCalls('text-[15px] rounded-[22px]');
    expect(flags.map((f) => f.kind)).toEqual(['arbitrary-size', 'arbitrary-size']);
  });

  it('does not flag var() arbitrary values or token utilities', () => {
    expect(findJudgmentCalls('text-[var(--text-lg)] rounded-md')).toEqual([]);
  });
});

describe('countConversions sizes a migration', () => {
  it('tallies every gotcha kind', () => {
    const counts = countConversions('shadow-md shadow-lg opacity-50 text-[15px]');
    expect(counts['box-shadow']).toBe(2);
    expect(counts['opacity']).toBe(1);
    expect(counts['arbitrary-size']).toBe(1);
  });
});

describe('table shape', () => {
  it('every entry is deterministic-with-replace or judgment-with-suggest', () => {
    for (const c of CONVERSIONS) {
      if (c.deterministic) expect(typeof c.replace).toBe('function');
      else expect(typeof c.suggest).toBe('string');
    }
    expect(DETERMINISTIC.length).toBeGreaterThan(0);
  });
});
