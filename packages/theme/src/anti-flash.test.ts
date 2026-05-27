/**
 * anti-flash — the emitted IIFE is plain pre-bundle JS, so we run the string
 * directly (with `localStorage`/`document` injected as parameters) and assert
 * which `--token` custom properties it writes to documentElement.
 */
import { describe, expect, it } from 'vitest';
import { getAntiFlashScript } from './anti-flash';
import { STORAGE_KEY } from './storage-key';

/**
 * Run the script string with a stubbed storage + DOM. Returns the props it set
 * and what (if anything) it wrote back to storage, so first-visit randomization
 * (which persists its pick) can be asserted on both.
 */
function run(
  script: string,
  saved: string | null,
): { props: Record<string, string>; saved: string | null } {
  const props: Record<string, string> = {};
  const store = { value: saved };
  const localStorage = {
    getItem: (k: string) => (k === STORAGE_KEY ? store.value : null),
    setItem: (k: string, v: string) => {
      if (k === STORAGE_KEY) store.value = v;
    },
  };
  const document = {
    documentElement: { style: { setProperty: (k: string, v: string) => void (props[k] = v) } },
  };
  // The IIFE references bare `localStorage`/`document`; bind them as args.
  new Function('localStorage', 'document', script)(localStorage, document);
  return { props, saved: store.value };
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

  describe('first-visit randomization', () => {
    const firstVisit = {
      pool: [
        { id: 'a', tokens: { 'color-primary': '#a1a1a1' } },
        { id: 'b', tokens: { 'color-primary': '#b2b2b2' } },
      ],
      enabledIds: ['default-light', 'a', 'b'],
    };

    it('picks a pool theme on a first visit, applies it, and persists the choice', () => {
      const { props, saved } = run(getAntiFlashScript(undefined, firstVisit), null);
      const picked = props['--color-primary'];
      expect(['#a1a1a1', '#b2b2b2']).toContain(picked);

      // The pick is written back (with tokens, so later loads re-apply it without
      // a flash) and React reads the same currentId.
      const lib = JSON.parse(saved!);
      const pickedId = picked === '#a1a1a1' ? 'a' : 'b';
      expect(lib).toMatchObject({
        themes: [{ id: pickedId, tokens: { 'color-primary': picked } }],
        enabledIds: firstVisit.enabledIds,
        currentId: pickedId,
      });
    });

    it('re-applies the persisted pick without re-randomizing on a later load', () => {
      const script = getAntiFlashScript(undefined, firstVisit);
      const first = run(script, null);
      // Feed the written library back in, as a later page load would see it.
      const second = run(script, first.saved);
      expect(second.props).toEqual(first.props);
      expect(second.saved).toBe(first.saved);
    });

    it('does not randomize or overwrite when a library is already saved', () => {
      const { props, saved } = run(getAntiFlashScript(undefined, firstVisit), savedLib);
      expect(props).toEqual({ '--color-primary': '#aaaaaa' });
      expect(saved).toBe(savedLib);
    });

    it('falls back to default tokens when the pool is empty', () => {
      const script = getAntiFlashScript({ 'color-primary': '#000000' }, { pool: [], enabledIds: [] });
      const { props, saved } = run(script, null);
      expect(props).toEqual({ '--color-primary': '#000000' });
      expect(saved).toBeNull();
    });

    it('escapes "<" in inlined pool token values', () => {
      const script = getAntiFlashScript(undefined, {
        pool: [{ id: 'x', tokens: { 'font-sans': 'a</script>b' } }],
        enabledIds: ['x'],
      });
      expect(script).not.toContain('</script>');
      expect(script).toContain('\\u003c');
    });
  });
});
