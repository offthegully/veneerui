/**
 * validateTheme — the security and correctness boundary for untrusted themes.
 *
 * Pure and isomorphic: it takes an injected `checkValue` so the same logic runs
 * in the browser (browserCheckValue) and in Node/CI (nodeCheckValue). Runs at
 * three points in the system: CI on contribution, client on import, client on apply.
 */
import { SCHEMA_VERSION, type Theme } from './types';
import {
  ALLOWED_FONT_FAMILIES,
  CUSTOM_COLOR_PREFIX,
  CUSTOM_COLOR_RE,
  MAX_CUSTOM_COLORS,
  TOKEN_BY_NAME,
  TOKEN_SCHEMA,
  isCustomColorName,
} from './schema';
import type { ValueChecker } from './value-check';

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  /** Present only when valid: a normalized theme with unknown tokens dropped. */
  theme?: Theme;
}

/**
 * Forbidden substrings even if they would parse as valid CSS — these are the
 * vectors for breaking out of a single property value (CSS injection, remote
 * loads, script execution).
 */
const DANGEROUS_PATTERNS: RegExp[] = [
  /url\s*\(/i,
  /expression\s*\(/i,
  /javascript:/i,
  /@import/i,
  /[;{}<>]/,
];

export function hasDangerousPattern(value: string): boolean {
  return DANGEROUS_PATTERNS.some((re) => re.test(value));
}

/** Every named family in a font stack must be bundled or a generic keyword. */
export function isAllowedFontStack(value: string): boolean {
  return value.split(',').every((part) => {
    const family = part.trim().replace(/^['"]/, '').replace(/['"]$/, '').toLowerCase();
    return family.length > 0 && ALLOWED_FONT_FAMILIES.has(family);
  });
}

function coerceAuthor(raw: unknown): Theme['author'] {
  if (raw && typeof raw === 'object') {
    const a = raw as Record<string, unknown>;
    return { id: typeof a.id === 'string' ? a.id : '', name: typeof a.name === 'string' ? a.name : 'unknown' };
  }
  if (typeof raw === 'string') return { id: '', name: raw };
  return { id: '', name: 'unknown' };
}

function newId(): string {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `theme-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function validateTheme(input: unknown, checkValue: ValueChecker): ValidationResult {
  const errors: ValidationError[] = [];
  const fail = (path: string, message: string) => errors.push({ path, message });

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { valid: false, errors: [{ path: '', message: 'Theme must be a JSON object' }] };
  }
  const obj = input as Record<string, unknown>;

  if (typeof obj.name !== 'string' || obj.name.trim() === '') fail('name', 'Missing or empty "name"');
  if (typeof obj.version !== 'string') fail('version', 'Missing "version" (semver string)');
  if (obj.schemaVersion !== SCHEMA_VERSION) {
    fail('schemaVersion', `Unsupported schemaVersion ${JSON.stringify(obj.schemaVersion)} (this app supports ${SCHEMA_VERSION})`);
  }
  if (typeof obj.tokens !== 'object' || obj.tokens === null || Array.isArray(obj.tokens)) {
    fail('tokens', 'Missing "tokens" object');
    return { valid: false, errors };
  }

  const cleaned: Record<string, string> = {};
  let customColorCount = 0;
  for (const [key, raw] of Object.entries(obj.tokens as Record<string, unknown>)) {
    const tokenDef = TOKEN_BY_NAME.get(key);
    if (!tokenDef) {
      // Open custom-color namespace: the one place an unknown key is kept rather
      // than dropped. Everything outside `color-x-*` stays a silent drop (forward-
      // compatible with future schema additions); a `color-x-`-prefixed key that's
      // malformed fails loudly, because that's a typo, not a future token.
      if (!key.startsWith(CUSTOM_COLOR_PREFIX)) continue; // unknown, non-custom → dropped, not fatal
      if (!isCustomColorName(key)) {
        fail(`tokens.${key}`, `Malformed custom color name; must match ${CUSTOM_COLOR_RE}`);
        continue;
      }
      // Cap first, before the expensive css value check, so a flood is cheap to reject.
      if (customColorCount >= MAX_CUSTOM_COLORS) {
        fail(`tokens.${key}`, `Too many custom colors (max ${MAX_CUSTOM_COLORS})`);
        continue;
      }
      if (typeof raw !== 'string') {
        fail(`tokens.${key}`, 'Value must be a string');
        continue;
      }
      const value = raw.trim();
      if (hasDangerousPattern(value)) {
        fail(`tokens.${key}`, `Value contains a forbidden pattern: ${JSON.stringify(value)}`);
        continue;
      }
      // Reject var(): css-tree (Node/CI) and CSS.supports (browser) disagree on
      // whether a var() reference is a valid color, and stored themes aren't
      // re-validated on apply. Forbidding var() keeps custom colors deterministic
      // across both checkers. (Schema colors share the skew but are curated.)
      if (/var\s*\(/i.test(value)) {
        fail(`tokens.${key}`, 'Custom colors may not use var()');
        continue;
      }
      if (!checkValue(value, 'color')) {
        fail(`tokens.${key}`, `Invalid color value: ${JSON.stringify(value)}`);
        continue;
      }
      cleaned[key] = value;
      customColorCount++;
      continue;
    }
    if (typeof raw !== 'string') {
      fail(`tokens.${key}`, 'Value must be a string');
      continue;
    }
    const value = raw.trim();
    if (hasDangerousPattern(value)) {
      fail(`tokens.${key}`, `Value contains a forbidden pattern: ${JSON.stringify(value)}`);
      continue;
    }
    if (tokenDef.type === 'fontFamily' && !isAllowedFontStack(value)) {
      fail(`tokens.${key}`, `Font family must come from the bundled set: ${JSON.stringify(value)}`);
      continue;
    }
    if (!checkValue(value, tokenDef.type)) {
      fail(`tokens.${key}`, `Invalid ${tokenDef.type} value: ${JSON.stringify(value)}`);
      continue;
    }
    cleaned[key] = value;
  }

  for (const tokenDef of TOKEN_SCHEMA) {
    if (tokenDef.required && !(tokenDef.name in cleaned)) {
      fail(`tokens.${tokenDef.name}`, 'Required token is missing or invalid');
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  const theme: Theme = {
    id: typeof obj.id === 'string' && obj.id ? obj.id : newId(),
    name: (obj.name as string).trim(),
    description: typeof obj.description === 'string' ? obj.description : undefined,
    author: coerceAuthor(obj.author),
    version: obj.version as string,
    schemaVersion: SCHEMA_VERSION,
    tags: Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === 'string') : undefined,
    license: typeof obj.license === 'string' ? obj.license : undefined,
    tokens: cleaned,
    source: 'builtin',
  };

  return { valid: true, errors: [], theme };
}
