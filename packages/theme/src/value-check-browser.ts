/** Browser value checker — uses the native CSS.supports() grammar engine. */
import type { TokenType } from './types';
import { GRADIENT_RE, NUMBER_RE, TYPE_PROPERTY, type ValueChecker } from './value-check';

export const browserCheckValue: ValueChecker = (value: string, type: TokenType): boolean => {
  if (type === 'number') return NUMBER_RE.test(value);
  if (type === 'gradient') return GRADIENT_RE.test(value) && CSS.supports('background-image', value);
  return CSS.supports(TYPE_PROPERTY[type], value);
};
