/**
 * Node/CI value checker — mirrors the browser one but uses css-tree's lexer
 * since CSS.supports doesn't exist outside the browser. Used by tests and by the
 * gallery's PR validation (Phase 4). Kept in its own file so css-tree never ends
 * up in the browser bundle.
 */
import { lexer } from 'css-tree';
import type { TokenType } from './types';
import { GRADIENT_RE, NUMBER_RE, TYPE_PROPERTY, type ValueChecker } from './value-check';

const matchesProperty = (property: string, value: string): boolean =>
  lexer.matchProperty(property, value).error === null;

export const nodeCheckValue: ValueChecker = (value: string, type: TokenType): boolean => {
  if (type === 'number') return NUMBER_RE.test(value);
  if (type === 'gradient') return GRADIENT_RE.test(value) && matchesProperty('background-image', value);
  return matchesProperty(TYPE_PROPERTY[type], value);
};
