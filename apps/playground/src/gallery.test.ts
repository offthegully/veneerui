/**
 * Every shipped gallery theme must pass the exact validation boundary the app
 * (and Phase 4 CI) enforce on import — no invalid CSS values, no disallowed
 * fonts, no dangerous patterns, no dropped tokens from typos. This is what lets
 * us promise the examples are safe starting points, not just decoration.
 *
 * Reads the gallery .json files at transform time via import.meta.glob (no Node
 * fs), so it runs in the plain `node` test env.
 */
import { describe, expect, it } from 'vitest';
import { validateTheme } from '@offthegully/veneerui';
import { nodeCheckValue } from '@offthegully/veneerui/node';

const themes = import.meta.glob<unknown>('../../../gallery/themes/*/theme.json', {
  import: 'default',
  eager: true,
});

const entries = Object.entries(themes).map(([path, json]) => ({
  slug: path.split('/').slice(-2, -1)[0],
  json: json as Record<string, unknown>,
}));

describe('gallery themes', () => {
  it('ships the documented set of examples', () => {
    expect(entries.map((e) => e.slug).sort()).toEqual([
      'brutalist',
      'editorial',
      'glassmorphic',
      'high-contrast',
      'monospaced',
      'neon-arcade',
      'neumorphic',
      'sunset-paper',
      'terminal',
      'warm-library',
      'windows-95',
    ]);
  });

  for (const { slug, json } of entries) {
    describe(slug, () => {
      it('references the published $schema', () => {
        expect(json.$schema).toBe('https://veneerui.dev/schemas/theme-v1.json');
      });

      it('validates with no errors and no dropped tokens', () => {
        const result = validateTheme(json, nodeCheckValue);
        expect(result.errors).toEqual([]);
        expect(result.valid).toBe(true);
        // Every authored token is a real schema token with a valid value.
        const authored = Object.keys((json.tokens as Record<string, string>) ?? {});
        expect(Object.keys(result.theme!.tokens).length).toBe(authored.length);
      });
    });
  }
});
