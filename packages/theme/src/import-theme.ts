/**
 * Import pipeline: turn untrusted text (a dropped file or a fetched URL) into a
 * library-ready Theme — or a list of human-readable errors.
 *
 * Every path runs through the same `validateTheme()` boundary before the result
 * can touch the DOM, so a fetched file is just inert data: there is no code path
 * from imported text to execution. The only thing this module adds on top of
 * validation is provenance — where the theme came from (`source`/`sourceUrl`),
 * which the library uses for de-dup and the optional Phase-5 update check.
 */
import { validateTheme, type ValidationError } from './validate';
import type { ValueChecker } from './value-check';
import type { Theme } from './types';

export interface ImportOutcome {
  ok: boolean;
  theme?: Theme;
  errors: ValidationError[];
}

/** A locally-authored file vs. something pulled from a gallery/raw URL. */
export type Origin = { source: 'custom' } | { source: 'imported'; sourceUrl: string };

const fail = (message: string, path = ''): ImportOutcome => ({
  ok: false,
  errors: [{ path, message }],
});

/** Parse + validate text into a Theme, stamping provenance from `origin`. */
export function parseAndValidate(
  text: string,
  checkValue: ValueChecker,
  origin: Origin,
): ImportOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return fail(`Not valid JSON: ${(e as Error).message}`);
  }

  const result = validateTheme(parsed, checkValue);
  if (!result.valid || !result.theme) return { ok: false, errors: result.errors };

  const theme: Theme =
    origin.source === 'imported'
      ? { ...result.theme, source: 'imported', sourceUrl: origin.sourceUrl, importedAt: new Date().toISOString() }
      : { ...result.theme, source: 'custom' };

  return { ok: true, theme, errors: [] };
}

/** A raw URL we'll fetch from. Only http(s) — no file://, data:, etc. */
export function isFetchableUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Fetch a theme from a raw URL and validate it. `raw.githubusercontent.com`
 * serves permissive CORS, so this works from the browser with no proxy. The
 * fetched body is treated as inert data — validated before it can be applied.
 */
export async function fetchTheme(url: string, checkValue: ValueChecker): Promise<ImportOutcome> {
  if (!isFetchableUrl(url)) return fail('Enter a valid http(s) URL', 'url');
  let text: string;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return fail(`Fetch failed: ${res.status} ${res.statusText}`, 'url');
    text = await res.text();
  } catch (e) {
    return fail(`Could not fetch URL: ${(e as Error).message}`, 'url');
  }
  return parseAndValidate(text, checkValue, { source: 'imported', sourceUrl: url });
}
