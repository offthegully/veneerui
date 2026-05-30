import { describe, expect, it } from 'vitest';
import { analyze, findThemeCollisions } from './doctor';

describe('analyze', () => {
  it('counts un-themed islands and reports a themeable percentage', () => {
    const report = analyze([
      { path: 'a.tsx', text: '<div className="bg-blue-500 shadow-md" />' },
      { path: 'b.tsx', text: '<div className="bg-primary rounded-md" />' }, // clean
    ]);
    expect(report.codeFilesScanned).toBe(2);
    expect(report.filesWithIslands).toBe(1);
    expect(report.islandsByKind['palette-utility']).toBe(1);
    expect(report.islandsByKind['box-shadow']).toBe(1);
    expect(report.totalIslands).toBe(2);
    expect(report.percentThemeable).toBe(50);
  });

  it('reports 100% themeable for a fully tokenised codebase', () => {
    const report = analyze([
      { path: 'a.tsx', text: '<div className="bg-surface text-text border-border" />' },
      { path: 'b.tsx', text: 'const x = "rounded-md p-4 [box-shadow:var(--shadow-md)]"' },
    ]);
    expect(report.totalIslands).toBe(0);
    expect(report.percentThemeable).toBe(100);
  });

  it('flags bare color literals only in markup files, not .ts schemas', () => {
    const report = analyze([
      { path: 'schema.ts', text: "const c = '#ff0000'" }, // legit in a .ts schema
      { path: 'card.tsx', text: "<div style={{ color: '#ff0000' }} />" },
    ]);
    expect(report.islandsByKind['inline-color']).toBe(1);
    expect(report.findings.map((f) => f.path)).toEqual(['card.tsx']);
  });

  it('detects shadcn @theme collisions with reserved Veneer tokens', () => {
    const css = `@theme {\n  --color-primary: #abc;\n  --color-border: #def;\n  --my-own: 1px;\n}`;
    const report = analyze([{ path: 'globals.css', text: css }]);
    expect(report.cssFilesScanned).toBe(1);
    expect(report.collisions.map((c) => c.token).sort()).toEqual(['color-border', 'color-primary']);
    // a non-reserved custom property is not a collision
    expect(report.collisions.some((c) => c.token === 'my-own')).toBe(false);
  });

  it('handles an empty project as fully themeable', () => {
    const report = analyze([]);
    expect(report.percentThemeable).toBe(100);
    expect(report.totalIslands).toBe(0);
  });
});

describe('findThemeCollisions', () => {
  it('matches @theme inline blocks too', () => {
    expect(findThemeCollisions('@theme inline { --color-text: #000; }')).toEqual(['color-text']);
  });

  it('ignores token names outside an @theme block', () => {
    expect(findThemeCollisions(':root { --color-primary: #abc; }')).toEqual([]);
  });
});
