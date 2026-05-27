/** Types for the plain-JS detector shared by the ESLint rule and the conformance test. */
export interface ColorViolation {
  /** The matched text (e.g. "bg-blue-500"). */
  value: string;
  /** Offset of the match within the scanned string. */
  index: number;
  /** Which contract the match violates. */
  kind: 'palette-utility' | 'arbitrary-color' | 'inline-color';
}

export function findClassColorViolations(text: string): ColorViolation[];
export function findBareColorLiterals(text: string): ColorViolation[];

export const PALETTE_UTILITY_RE: RegExp;
export const ARBITRARY_COLOR_RE: RegExp;
export const BARE_COLOR_RE: RegExp;
