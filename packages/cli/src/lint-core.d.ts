/**
 * Ambient types for the plain-JS `@veneerui/lint-core` modules. The CLI is the
 * only TypeScript consumer (the playground rule and eslint-plugin-veneer are
 * JS); these mirror the runtime shapes so `doctor`/`migrate` get checked imports.
 * tsup still bundles the real JS — lint-core is a devDependency, so it's inlined.
 */
declare module '@veneerui/lint-core/detect' {
  export interface ColorMatch {
    value: string;
    index: number;
    kind: 'palette-utility' | 'arbitrary-color' | 'inline-color';
  }
  export function findClassColorViolations(text: string): ColorMatch[];
  export function findBareColorLiterals(text: string): ColorMatch[];
}

declare module '@veneerui/lint-core/conversions' {
  export interface ConversionMatch {
    kind: string;
    value: string;
    index: number;
    deterministic: boolean;
    suggest?: string;
  }
  export function findConversions(text: string): ConversionMatch[];
  export function countConversions(text: string): Record<string, number>;
  export function applyDeterministic(text: string): {
    output: string;
    applied: { kind: string; from: string }[];
  };
  export function findJudgmentCalls(
    text: string,
  ): { kind: string; value: string; index: number; suggest: string }[];
  export function classRegions(text: string): { start: number; end: number }[];
  export function migrateSource(text: string): {
    output: string;
    applied: { kind: string; from: string }[];
  };
  export function findSourceConversions(text: string): ConversionMatch[];
}

declare module '@veneerui/lint-core/reserved-tokens' {
  export const RESERVED_TOKEN_NAMES: readonly string[];
}

declare module '@veneerui/lint-core/font-packages' {
  export interface FontPackage {
    family: string;
    pkg: string;
    imports: string[];
    note?: string;
  }
  export const FONT_PACKAGES: readonly FontPackage[];
}
