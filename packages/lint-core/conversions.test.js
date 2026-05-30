import { describe, expect, it } from 'vitest';
import {
  CONVERSIONS,
  DETERMINISTIC,
  applyDeterministic,
  findJudgmentCalls,
  countConversions,
  classRegions,
  migrateSource,
  findSourceConversions,
} from './conversions.js';

describe('deterministic conversions round-trip the AGENTS.md gotchas', () => {
  const cases = [
    ['flex shadow-md p-2', 'flex [box-shadow:var(--shadow-md)] p-2'],
    ['shadow-card', '[box-shadow:var(--shadow-card)]'],
    ['inset-shadow-lg', '[box-shadow:var(--inset-shadow-lg)]'],
    ['text-shadow-glow', '[text-shadow:var(--text-shadow-glow)]'],
    ['border p-2', '[border-width:var(--border-width-default)] p-2'],
    ['border-2', '[border-width:var(--border-width-default)]'],
    // width only — the author's existing color utility is preserved, never duplicated
    ['border border-border', '[border-width:var(--border-width-default)] border-border'],
    ['border border-text-inverse/40', '[border-width:var(--border-width-default)] border-text-inverse/40'],
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

  it('does not flag opacity-0 / opacity-100 (animation states, not tokens)', () => {
    expect(findJudgmentCalls('opacity-0 group-hover:opacity-100')).toEqual([]);
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

describe('migrateSource scopes rewrites to className/class attributes', () => {
  it('rewrites utilities inside a className attribute', () => {
    expect(migrateSource('<div className="flex shadow-md border border-border" />').output).toBe(
      '<div className="flex [box-shadow:var(--shadow-md)] [border-width:var(--border-width-default)] border-border" />',
    );
  });

  it('rewrites inside a braced className (template + ternary class lists)', () => {
    const src = '<div className={`p-2 ${big ? "shadow-lg" : "shadow-sm"}`} />';
    const out = migrateSource(src).output;
    expect(out).toContain('[box-shadow:var(--shadow-lg)]');
    expect(out).toContain('[box-shadow:var(--shadow-sm)]');
  });

  it('handles class= (plain HTML) too', () => {
    expect(migrateSource('<div class="border" />').output).toBe(
      '<div class="[border-width:var(--border-width-default)]" />',
    );
  });

  // The regression that motivated scoping: utility-looking tokens OUTSIDE a
  // className must NEVER be rewritten.
  it('does NOT touch a token-name string literal (schema data)', () => {
    const src = "def('shadow-md', 'shadow', 'Shadows', 'theme', '…');";
    expect(migrateSource(src).output).toBe(src);
  });

  it('does NOT touch prose, JSX text, or comments', () => {
    for (const src of [
      '// shadow-md bakes its geometry at build time',
      '<p>Higher elevation via shadow-lg — note the offset.</p>',
      'const names = ["shadow-md", "border", "text-shadow-sm"];',
      "const desc = 'Default border width';",
    ]) {
      expect(migrateSource(src).output).toBe(src);
    }
  });

  it('is idempotent over a whole file', () => {
    const src = '<a className="shadow-lg border">x</a>';
    const once = migrateSource(src).output;
    expect(migrateSource(once).output).toBe(once);
  });
});

describe('classRegions / findSourceConversions', () => {
  it('finds only className attribute spans', () => {
    const regions = classRegions('<div className="shadow-md" data-x="shadow-lg" />');
    expect(regions.length).toBe(1); // data-x is not a class attribute
  });

  it('flags judgment calls only inside class regions', () => {
    const flags = findSourceConversions('const x = "opacity-50";\n<div className="opacity-50" />');
    // the lone string literal is ignored; only the className opacity is found
    expect(flags.filter((f) => f.kind === 'opacity').length).toBe(1);
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
