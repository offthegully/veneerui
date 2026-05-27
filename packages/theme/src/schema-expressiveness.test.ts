/**
 * Phase 0 schema-validation: prove the token set can express fundamentally
 * different design languages (not just palette swaps), and that the validator
 * accepts realistic themes. If one of these can't be expressed, the schema is
 * missing tokens — the cheapest possible moment to discover that.
 */
import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from './types';
import { validateTheme } from './validate';
import { nodeCheckValue } from './value-check-node';

const wrap = (name: string, tokens: Record<string, string>) => ({
  name,
  author: 'phase0',
  version: '1.0.0',
  schemaVersion: SCHEMA_VERSION,
  tokens: { 'color-primary': '#000', 'color-surface': '#fff', 'color-text': '#111', 'text-base': '16px', ...tokens },
});

const expectValid = (json: unknown) => {
  const result = validateTheme(json, nodeCheckValue);
  expect(result.errors).toEqual([]);
  expect(result.valid).toBe(true);
};

describe('schema expressiveness', () => {
  it('expresses a brutalist theme', () => {
    expectValid(
      wrap('Brutalist', {
        'radius-md': '0px',
        'radius-lg': '0px',
        'border-width-default': '2px',
        'border-width-thick': '4px',
        'shadow-md': '4px 4px 0 0 #000000', // hard offset, no blur
        'font-display': "'Archivo Black', sans-serif",
        'tracking-tight': '-0.04em',
        'font-weight-black': '900',
        'duration-default': '80',
        'ease-default': 'cubic-bezier(0.2, 0, 0, 1)',
      }),
    );
  });

  it('expresses a neumorphic theme', () => {
    expectValid(
      wrap('Neumorphic', {
        'color-surface': '#e0e5ec',
        'color-surface-raised': '#e0e5ec',
        'radius-2xl': '24px',
        'inset-shadow-sm': 'inset 2px 2px 5px rgb(163 177 198 / 0.6)',
        'inset-shadow-lg': 'inset -5px -5px 10px rgb(255 255 255 / 0.8)',
        'shadow-md': '6px 6px 12px rgb(163 177 198 / 0.6)',
        'ease-default': 'cubic-bezier(0.65, 0, 0.35, 1)',
      }),
    );
  });

  it('expresses a glassmorphic theme', () => {
    expectValid(
      wrap('Glassmorphic', {
        'color-surface': 'rgb(255 255 255 / 0.6)',
        'color-surface-raised': 'rgb(255 255 255 / 0.4)',
        'color-border-subtle': 'rgb(255 255 255 / 0.3)',
        'blur-md': '14px',
        'gradient-primary': 'linear-gradient(135deg, rgb(99 102 241 / 0.8) 0%, rgb(168 85 247 / 0.8) 100%)',
        'shadow-lg': '0 8px 32px rgb(31 38 135 / 0.37)',
      }),
    );
  });

  it('expresses an editorial theme', () => {
    expectValid(
      wrap('Editorial', {
        'font-sans': "'Source Serif 4 Variable', serif",
        'font-display': "'Fraunces Variable', serif",
        'spacing': '0.3rem',
        'text-5xl': '52px',
        'text-6xl': '72px',
        'leading-relaxed': '1.75',
        'tracking-tight': '-0.03em',
      }),
    );
  });
});
