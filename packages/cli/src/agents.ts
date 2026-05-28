/**
 * Agent-guide wiring for `init`. Veneer's whole contract is "drive everything
 * from tokens, never hardcode" — a rule AI coding tools only follow if it's
 * written down where they look. So `init` drops a usage guide into the project's
 * AGENTS.md / CLAUDE.md (the files Cursor, Claude Code, Copilot, … read).
 *
 * The guide text ships as a markdown asset beside the built CLI (../assets, a
 * sibling of dist/ like ../registry), so it's authored as real markdown rather
 * than an escaped string. The upsert is pure and marker-delimited: re-running is
 * a no-op, and a guide update re-syncs in place without duplicating or touching
 * anything the user wrote outside the markers.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PatchResult } from './patch';

export const GUIDE_START = '<!-- veneer:guide:start -->';
export const GUIDE_END = '<!-- veneer:guide:end -->';
const GUIDE_NOTE =
  '<!-- Managed by `veneer init` — edits between these markers are overwritten on re-run. -->';

/** Doc files we target, in priority order. */
const AGENT_DOC_NAMES = ['AGENTS.md', 'CLAUDE.md'] as const;

const ASSET_PATH = fileURLToPath(new URL('../assets/agent-guide.md', import.meta.url));

/** The consumer-facing guide body (the markdown between the markers). */
export function readAgentGuide(path: string = ASSET_PATH): string {
  return readFileSync(path, 'utf8').trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The marker-delimited block written into a doc. */
function guideBlock(body: string): string {
  return [GUIDE_START, GUIDE_NOTE, '', body.trim(), '', GUIDE_END].join('\n');
}

/**
 * Insert or refresh the Veneer guide in an agent doc. `existing` is the file's
 * current text, or `null` if it doesn't exist yet. Pure, so it's `--dry-run`
 * safe and unit-testable:
 *   - no file        → a new doc titled and carrying the block
 *   - markers present → replace the block in place (re-sync on guide updates)
 *   - markers absent  → append the block, leaving prior content untouched
 */
export function upsertAgentGuide(existing: string | null, body: string): PatchResult {
  const block = guideBlock(body);

  if (existing == null) {
    return { content: `# AI agent guide\n\n${block}\n`, changed: true };
  }

  if (existing.includes(GUIDE_START) && existing.includes(GUIDE_END)) {
    const re = new RegExp(`${escapeRegExp(GUIDE_START)}[\\s\\S]*?${escapeRegExp(GUIDE_END)}`);
    const content = existing.replace(re, block);
    return { content, changed: content !== existing };
  }

  const trimmed = existing.replace(/\s+$/, '');
  return { content: `${trimmed}\n\n${block}\n`, changed: true };
}

/**
 * Which doc(s) `init` writes: every agent doc already in the project root, or —
 * if none exist — a fresh AGENTS.md (the vendor-neutral file most tools read).
 */
export function agentDocTargets(root: string): string[] {
  const present = AGENT_DOC_NAMES.filter((n) => existsSync(join(root, n)));
  return present.length ? present : ['AGENTS.md'];
}
