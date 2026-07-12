/**
 * anti-flash — the emitted IIFE is plain pre-bundle JS, so we run the string
 * directly (with `localStorage`/`document` injected as parameters) and assert
 * which `--token` custom properties it writes to documentElement.
 */
import { describe, expect, it } from 'vitest';
import { getAntiFlashScript } from './anti-flash';
import { STORAGE_KEY } from './storage-key';

/**
 * Run the script string with a stubbed storage + DOM, and return the custom
 * properties it wrote to documentElement.
 */
function run(script: string, saved: string | null): Record<string, string> {
  const props: Record<string, string> = {};
  const localStorage = {
    getItem: (k: string) => (k === STORAGE_KEY ? saved : null),
  };
  const document = {
    documentElement: {
      style: { setProperty: (k: string, v: string) => void (props[k] = v) },
    },
  };
  // The IIFE references bare `localStorage`/`document`; bind them as args.
  new Function('localStorage', 'document', script)(localStorage, document);
  return props;
}

const savedLib = JSON.stringify({
  currentId: 'saved',
  enabledIds: ['saved'],
  currentTokens: { 'color-primary': '#aaaaaa' },
});

describe('getAntiFlashScript', () => {
  it('with no default tokens, sets nothing when storage is empty', () => {
    expect(run(getAntiFlashScript(), null)).toEqual({});
  });

  it('applies the saved current theme when present', () => {
    expect(run(getAntiFlashScript(), savedLib)).toEqual({ '--color-primary': '#aaaaaa' });
  });

  it('applies the default tokens when storage is empty', () => {
    const script = getAntiFlashScript({ 'color-primary': '#000000', 'radius-md': '0px' });
    expect(run(script, null)).toEqual({ '--color-primary': '#000000', '--radius-md': '0px' });
  });

  it('lets a saved current theme win over the default tokens', () => {
    const script = getAntiFlashScript({ 'color-primary': '#000000' });
    expect(run(script, savedLib)).toEqual({ '--color-primary': '#aaaaaa' });
  });

  it('escapes "<" so a token value cannot break out of the script tag', () => {
    const script = getAntiFlashScript({ 'font-sans': 'a</script>b' });
    expect(script).not.toContain('</script>');
    expect(script).toContain('\\u003c');
  });
});
