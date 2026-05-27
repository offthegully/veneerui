/**
 * anti-flash — the emitted IIFE is plain pre-bundle JS, so we run the string
 * directly (with `localStorage`/`document` injected as parameters) and assert
 * which `--token` custom properties it writes to documentElement.
 */
import { describe, expect, it } from 'vitest';
import { getAntiFlashScript, SHUFFLE_ATTR } from './anti-flash';
import { STORAGE_KEY } from './storage-key';

/**
 * Run the script string with a stubbed storage + DOM. Returns the custom props it
 * set, any attributes it wrote to <html> (the shuffle path records its pick there),
 * and whether it touched storage (the shuffle path must not — it's ephemeral).
 */
function run(
  script: string,
  saved: string | null,
): { props: Record<string, string>; attrs: Record<string, string>; wrote: boolean } {
  const props: Record<string, string> = {};
  const attrs: Record<string, string> = {};
  let wrote = false;
  const localStorage = {
    getItem: (k: string) => (k === STORAGE_KEY ? saved : null),
    setItem: () => {
      wrote = true;
    },
  };
  const document = {
    documentElement: {
      style: { setProperty: (k: string, v: string) => void (props[k] = v) },
      setAttribute: (k: string, v: string) => void (attrs[k] = v),
    },
  };
  // The IIFE references bare `localStorage`/`document`; bind them as args.
  new Function('localStorage', 'document', script)(localStorage, document);
  return { props, attrs, wrote };
}

const savedLib = JSON.stringify({
  themes: [{ id: 'saved', tokens: { 'color-primary': '#aaaaaa' } }],
  currentId: 'saved',
});

describe('getAntiFlashScript', () => {
  it('with no default tokens, sets nothing when storage is empty', () => {
    expect(run(getAntiFlashScript(), null).props).toEqual({});
  });

  it('applies the saved current theme when present', () => {
    expect(run(getAntiFlashScript(), savedLib).props).toEqual({ '--color-primary': '#aaaaaa' });
  });

  it('applies the default tokens when storage is empty', () => {
    const script = getAntiFlashScript({ 'color-primary': '#000000', 'radius-md': '0px' });
    expect(run(script, null).props).toEqual({ '--color-primary': '#000000', '--radius-md': '0px' });
  });

  it('lets a saved current theme win over the default tokens', () => {
    const script = getAntiFlashScript({ 'color-primary': '#000000' });
    expect(run(script, savedLib).props).toEqual({ '--color-primary': '#aaaaaa' });
  });

  it('escapes "<" so a token value cannot break out of the script tag', () => {
    const script = getAntiFlashScript({ 'font-sans': 'a</script>b' });
    expect(script).not.toContain('</script>');
    expect(script).toContain('\\u003c');
  });

  describe('shuffle-until-pinned', () => {
    const pool = [
      { id: 'a', tokens: { 'color-primary': '#a1a1a1' } },
      { id: 'b', tokens: { 'color-primary': '#b2b2b2' } },
    ];
    const pinnedLib = JSON.stringify({
      themes: [{ id: 'saved', tokens: { 'color-primary': '#aaaaaa' } }],
      currentId: 'saved',
      pinned: true,
    });

    it('picks a pool theme on an empty (first) load, applies it, and records the pick', () => {
      const { props, attrs, wrote } = run(getAntiFlashScript(undefined, pool), null);
      const picked = props['--color-primary'];
      expect(['#a1a1a1', '#b2b2b2']).toContain(picked);
      // The pick is recorded on <html> for the provider to read back.
      expect(attrs[SHUFFLE_ATTR]).toBe(picked === '#a1a1a1' ? 'a' : 'b');
      // Shuffle is ephemeral — it must never touch storage.
      expect(wrote).toBe(false);
    });

    it('re-rolls on a later unpinned load (does not honor the stored currentId)', () => {
      // An unpinned library (e.g. saved after toggling a theme) is ignored: still shuffles.
      const unpinned = JSON.stringify({ themes: pool, currentId: 'a', pinned: false });
      const { props, attrs } = run(getAntiFlashScript(undefined, pool), unpinned);
      expect(['#a1a1a1', '#b2b2b2']).toContain(props['--color-primary']);
      expect(['a', 'b']).toContain(attrs[SHUFFLE_ATTR]);
    });

    it('applies the pinned theme and does NOT shuffle when the library is pinned', () => {
      const { props, attrs, wrote } = run(getAntiFlashScript(undefined, pool), pinnedLib);
      expect(props).toEqual({ '--color-primary': '#aaaaaa' });
      expect(attrs[SHUFFLE_ATTR]).toBeUndefined();
      expect(wrote).toBe(false);
    });

    it('falls back to default tokens (no shuffle) when the pool is empty', () => {
      const script = getAntiFlashScript({ 'color-primary': '#000000' }, []);
      const { props, attrs } = run(script, null);
      expect(props).toEqual({ '--color-primary': '#000000' });
      expect(attrs[SHUFFLE_ATTR]).toBeUndefined();
    });

    it('escapes "<" in inlined pool token values', () => {
      const script = getAntiFlashScript(undefined, [{ id: 'x', tokens: { 'font-sans': 'a</script>b' } }]);
      expect(script).not.toContain('</script>');
      expect(script).toContain('\\u003c');
    });
  });
});
