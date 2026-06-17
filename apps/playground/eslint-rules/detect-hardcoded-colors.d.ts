/** Types for the plain-JS detector shared by the ESLint rule and the conformance test. */
export interface ColorViolation {
  /** The matched text (e.g. "bg-blue-500"). */
  value: string;
  /** Offset of the match within the scanned string. */
  index: number;
  /** Which contract the match violates. */
  kind: 'palette-utility' | 'arbitrary-color' | 'inline-color';
}

/** A non-color island match (shadow/spacing/opacity), with an optional autofix. */
export interface IslandViolation {
  value: string;
  index: number;
  kind: 'baked-shadow' | 'island-spacing' | 'dead-opacity';
  /** Token-driven replacement, when one exists (shadow + spacing). */
  fix?: string;
}

export function findClassColorViolations(text: string): ColorViolation[];
export function findBareColorLiterals(text: string): ColorViolation[];
export function findBakedShadows(text: string): IslandViolation[];
export function findIslandSpacing(text: string): IslandViolation[];
export function findDeadOpacity(text: string): IslandViolation[];

export const PALETTE_UTILITY_RE: RegExp;
export const ARBITRARY_COLOR_RE: RegExp;
export const BARE_COLOR_RE: RegExp;
export const BAKED_SHADOW_RE: RegExp;
export const ISLAND_SPACING_RE: RegExp;
export const DEAD_OPACITY_RE: RegExp;

/** Per-type baked-shadow token scales (the source for detection + autofixes). */
export const SHADOW_SCALES: Readonly<Record<'shadow' | 'inset-shadow' | 'text-shadow', readonly string[]>>;
