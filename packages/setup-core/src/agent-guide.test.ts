/**
 * Consumer-contract guard for the shipped agent guide.
 *
 * `agent-guide.md` is injected into every consumer's AGENTS.md by `init`, and it's
 * an editorially-compressed rewrite of the repo's AGENTS.md (not a generated copy),
 * so it can silently drop things on a hand-edit. It already did once: it told agents
 * `text-text-on-primary` covered status fills, omitting the four per-status on-colors
 * — shipping a white-on-light-green contrast bug. These assertions fail loudly if the
 * guide drops a per-status on-color or drifts from the schema-generated escape-hatch
 * forms, so that class of regression can't recur.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readAgentGuide } from './agents';

/** The "✅ Themeable form" column of the schema-generated escape-hatch table. */
function generatedEscapeForms(): string[] {
  const md = readFileSync(
    fileURLToPath(new URL('../../../docs/escape-hatches.generated.md', import.meta.url)),
    'utf8',
  );
  const forms: string[] = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 5) continue; // | label | wrong | right |
    const label = cells[1];
    if (!label || label === 'Token group' || label.startsWith('---')) continue;
    const form = cells[3].replace(/`/g, '');
    if (form && form !== '—') forms.push(form);
  }
  return forms;
}

describe('shipped agent-guide.md (consumer contract)', () => {
  const guide = readAgentGuide();

  it('documents every per-status on-color token (the contrast-regression guard)', () => {
    for (const token of [
      'text-text-on-primary',
      'text-text-on-accent',
      'text-text-on-success',
      'text-text-on-warning',
      'text-text-on-danger',
      'text-text-on-info',
    ]) {
      expect(guide).toContain(token);
    }
  });

  it('never tells agents to reuse on-primary for status fills', () => {
    expect(guide).not.toContain('primary/accent/status');
  });

  it('carries every schema-generated escape-hatch form (no compression drops)', () => {
    const forms = generatedEscapeForms();
    expect(forms.length).toBeGreaterThanOrEqual(6);
    for (const form of forms) expect(guide).toContain(form);
  });
});
