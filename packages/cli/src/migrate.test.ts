import { describe, expect, it } from 'vitest';
import { migrate } from './migrate';

describe('migrate — deterministic rewrites', () => {
  it('rewrites baked shadows, fixed borders, and fixed durations', () => {
    const src = '<div className="shadow-lg border duration-200" />';
    const { output, changed, applied } = migrate(src);
    expect(changed).toBe(true);
    expect(output).toBe(
      '<div className="[box-shadow:var(--shadow-lg)] [border-width:var(--border-width-default)] border-border duration-[calc(var(--duration-default)*1ms)]" />',
    );
    expect(applied.map((a) => a.kind).sort()).toEqual(['border-width', 'box-shadow', 'duration']);
  });

  it('leaves an already-tokenised file unchanged', () => {
    const src = '<div className="bg-surface [box-shadow:var(--shadow-md)] rounded-md" />';
    expect(migrate(src).changed).toBe(false);
  });

  it('is idempotent — running twice equals running once', () => {
    const src = 'className="shadow-md border-2 duration-300"';
    const once = migrate(src).output;
    const twice = migrate(once).output;
    expect(twice).toBe(once);
  });
});

describe('migrate — judgment calls are flagged, never auto-applied', () => {
  it('flags hardcoded colors with a line number and never rewrites them', () => {
    const src = 'line one\n<div className="bg-blue-500 text-white" />';
    const { output, flags } = migrate(src);
    expect(output).toBe(src); // colors untouched
    const colorFlags = flags.filter((f) => f.kind === 'palette-utility');
    expect(colorFlags.length).toBe(2);
    expect(colorFlags[0].line).toBe(2);
  });

  it('flags opacity and arbitrary sizes (the right token is a human call)', () => {
    const { output, flags } = migrate('className="opacity-50 text-[15px]"');
    expect(output).toBe('className="opacity-50 text-[15px]"');
    expect(flags.map((f) => f.kind).sort()).toEqual(['arbitrary-size', 'opacity']);
  });

  it('applies deterministic rewrites AND flags judgment calls in one pass', () => {
    const { output, applied, flags } = migrate('className="shadow-md bg-blue-500"');
    expect(output).toContain('[box-shadow:var(--shadow-md)]');
    expect(output).toContain('bg-blue-500'); // color left for the human
    expect(applied.some((a) => a.kind === 'box-shadow')).toBe(true);
    expect(flags.some((f) => f.kind === 'palette-utility')).toBe(true);
  });
});
