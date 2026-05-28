import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GUIDE_END,
  GUIDE_START,
  agentDocTargets,
  readAgentGuide,
  upsertAgentGuide,
} from './agents';

const BODY = '## Veneer theming\n\nDrive everything from tokens.';

describe('upsertAgentGuide', () => {
  it('creates a titled doc with the marked block when the file is absent', () => {
    const { content, changed } = upsertAgentGuide(null, BODY);
    expect(changed).toBe(true);
    expect(content).toMatch(/^# AI agent guide/);
    expect(content).toContain(GUIDE_START);
    expect(content).toContain(GUIDE_END);
    expect(content).toContain('Drive everything from tokens.');
  });

  it('appends the block to an existing doc without disturbing prior content', () => {
    const existing = '# My project rules\n\nAlways write tests.\n';
    const { content, changed } = upsertAgentGuide(existing, BODY);
    expect(changed).toBe(true);
    expect(content.startsWith(existing.trimEnd())).toBe(true);
    expect(content).toContain(GUIDE_START);
    expect(content).toContain('Always write tests.');
  });

  it('is idempotent — re-running makes no change', () => {
    const once = upsertAgentGuide(null, BODY).content;
    const twice = upsertAgentGuide(once, BODY);
    expect(twice.changed).toBe(false);
    expect(twice.content).toBe(once);
  });

  it('replaces the block in place when the guide changes, without duplicating markers', () => {
    const once = upsertAgentGuide(null, BODY).content;
    const updated = upsertAgentGuide(once, '## Veneer theming\n\nNew guidance.');
    expect(updated.changed).toBe(true);
    expect(updated.content).toContain('New guidance.');
    expect(updated.content).not.toContain('Drive everything from tokens.');
    // exactly one marked block remains
    expect(updated.content.split(GUIDE_START)).toHaveLength(2);
    expect(updated.content.split(GUIDE_END)).toHaveLength(2);
  });

  it('preserves text the user added outside the markers on re-sync', () => {
    const withUserNote = upsertAgentGuide(null, BODY).content + '\n## My notes\n\nKeep me.\n';
    const resynced = upsertAgentGuide(withUserNote, '## Veneer theming\n\nNewer.');
    expect(resynced.content).toContain('Keep me.');
    expect(resynced.content).toContain('Newer.');
  });
});

describe('agentDocTargets', () => {
  it('defaults to creating AGENTS.md when no agent doc exists', () => {
    const root = mkdtempSync(join(tmpdir(), 'veneer-agents-'));
    expect(agentDocTargets(root)).toEqual(['AGENTS.md']);
  });

  it('targets every agent doc already present', () => {
    const root = mkdtempSync(join(tmpdir(), 'veneer-agents-'));
    writeFileSync(join(root, 'AGENTS.md'), '# a');
    writeFileSync(join(root, 'CLAUDE.md'), '# c');
    expect(agentDocTargets(root).sort()).toEqual(['AGENTS.md', 'CLAUDE.md']);
  });
});

describe('readAgentGuide', () => {
  it('ships a non-empty guide that states the core token rule', () => {
    const guide = readAgentGuide();
    expect(guide.length).toBeGreaterThan(0);
    expect(guide).toMatch(/token/i);
    expect(guide).toContain('[box-shadow:var(--shadow');
  });
});
