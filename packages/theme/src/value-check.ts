/**
 * Shared pieces for per-type value validation. The actual CSS-validity check
 * differs by environment (CSS.supports in the browser, css-tree in Node/CI), so
 * those live in value-check-browser.ts and value-check-node.ts. This file holds
 * the type→property map and the format rules common to both.
 */
import type { TokenType } from './types';

/** A predicate that decides whether `value` is a valid instance of `type`. */
export type ValueChecker = (value: string, type: TokenType) => boolean;

/** CSS property whose grammar each token type is validated against. */
export const TYPE_PROPERTY: Record<TokenType, string> = {
  color: 'color',
  length: 'margin', // accepts <length> | <percentage> | 0
  shadow: 'box-shadow',
  fontFamily: 'font-family',
  easing: 'transition-timing-function',
  gradient: 'background-image',
  number: '', // handled by NUMBER_RE, not a CSS property
};

/** Unitless number (font-weight, line-height, opacity, duration-in-ms). */
export const NUMBER_RE = /^-?\d+(\.\d+)?$/;

/** A value must begin with a gradient function to be accepted as a gradient. */
export const GRADIENT_RE = /^(repeating-)?(linear|radial|conic)-gradient\(/i;
