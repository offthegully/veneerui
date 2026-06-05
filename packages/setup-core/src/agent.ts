/**
 * Model-agnostic agent hand-off for `create-veneerui --agent`.
 *
 * "Install, run one command, hand it off to an agent" — after the scaffolder
 * wires what it can deterministically, `--agent` lets an installed coding-agent
 * CLI finish/verify the project (and apply any `VENEER-SETUP.md` steps a template
 * reshape left behind). It is **opt-in only** (never runs without the flag) and
 * always degrades to printing a copy-paste prompt, so it stays safe and works
 * with any tool — `claude`, `codex`, or none at all.
 *
 * `buildAgentCommand` is pure (and unit-tested) so the exact non-interactive
 * invocation can't silently drift; `runAgentHandoff` does the detection + spawn.
 */
import { spawnSync } from 'node:child_process';
import { SETUP_FILE } from './setup-plan';

export type AgentName = 'claude' | 'codex';
/** What the user asked for: a specific agent, or `auto` to use whatever's installed. */
export type AgentChoice = AgentName | 'auto';

/** The one prompt — used both to drive an agent and as the printed fallback. */
export const SETUP_PROMPT =
  `Finish the Veneer setup described in ${SETUP_FILE} for this project, then verify it ` +
  `(typecheck/build, and the dev server renders with no console errors on the default theme) ` +
  `and delete ${SETUP_FILE} when done.`;

/** Is a binary on PATH? Cross-platform (`which`/`where`), never throws. */
export function hasBinary(bin: string): boolean {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  try {
    return spawnSync(probe, [bin], { stdio: 'ignore' }).status === 0;
  } catch {
    return false;
  }
}

/**
 * Resolve the agent to use, or null if none is available. `auto` prefers `claude`
 * then `codex`. The `has` probe is injectable for testing.
 */
export function resolveAgent(choice: AgentChoice, has: (bin: string) => boolean = hasBinary): AgentName | null {
  if (choice === 'claude' || choice === 'codex') return has(choice) ? choice : null;
  if (has('claude')) return 'claude';
  if (has('codex')) return 'codex';
  return null;
}

/**
 * The exact non-interactive command for an agent. The prompt is a single argv
 * element (never shell-interpolated), so a quirky project name can't inject.
 *   - claude: headless `-p`, auto-accepting edits, with Bash for the verify step.
 *   - codex:  `exec` in a workspace-write sandbox (no cwd flag — caller sets cwd);
 *             `--skip-git-repo-check` when the project has no git repo.
 */
export function buildAgentCommand(
  agent: AgentName,
  prompt: string,
  opts: { noGit?: boolean } = {},
): { cmd: string; args: string[] } {
  if (agent === 'claude') {
    return {
      cmd: 'claude',
      args: ['-p', prompt, '--permission-mode', 'acceptEdits', '--allowedTools', 'Read,Edit,Bash', '--bare'],
    };
  }
  return {
    cmd: 'codex',
    args: ['exec', prompt, '--sandbox', 'workspace-write', ...(opts.noGit ? ['--skip-git-repo-check'] : [])],
  };
}

export interface AgentHandoffOptions {
  /** The scaffolded app directory the agent should work in. */
  root: string;
  /** Which agent the user asked for (from `--agent[=claude|codex]`). */
  agent: AgentChoice;
  /** True when the app was created with `--no-git` (passed through to codex). */
  noGit?: boolean;
  log?: (line: string) => void;
}

export interface AgentHandoffResult {
  invoked: boolean;
  agent?: AgentName;
  failed?: boolean;
}

/** Print the copy-paste fallback — the universal, tool-agnostic path. */
function printSetupPrompt(log: (line: string) => void): void {
  log('\nFinish setup by pasting this into your AI coding agent (Claude Code, Codex, Cursor, …):\n');
  log(`  ${SETUP_PROMPT}\n`);
}

/** Display a command for the user (quoting args that contain spaces). */
function display(cmd: string, args: string[]): string {
  return `${cmd} ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`;
}

/**
 * Resolve and hand off to an agent (only call when `--agent` was passed). Spawns
 * the agent in `root` with inherited stdio; on a missing binary or a non-zero
 * exit it prints the copy-paste prompt so the user is never left half-wired.
 */
export function runAgentHandoff(opts: AgentHandoffOptions): AgentHandoffResult {
  const log = opts.log ?? console.log;
  const agent = resolveAgent(opts.agent);
  if (!agent) {
    log(
      opts.agent === 'auto'
        ? '\nNo `claude` or `codex` CLI found on PATH.'
        : `\nRequested agent \`${opts.agent}\` was not found on PATH.`,
    );
    printSetupPrompt(log);
    return { invoked: false };
  }

  const { cmd, args } = buildAgentCommand(agent, SETUP_PROMPT, { noGit: opts.noGit });
  log(`\nHanding off to ${agent} to finish setup (it will edit files in this project):`);
  log(`  ${display(cmd, args)}\n`);
  try {
    const res = spawnSync(cmd, args, { cwd: opts.root, stdio: 'inherit' });
    if (res.status === 0) return { invoked: true, agent };
    log(`\n${agent} exited with status ${res.status ?? 'unknown'}. Finish the remaining steps manually:`);
    printSetupPrompt(log);
    return { invoked: true, agent, failed: true };
  } catch (err) {
    log(`\nCould not run ${agent} (${err instanceof Error ? err.message : String(err)}). Finish manually:`);
    printSetupPrompt(log);
    return { invoked: false, agent };
  }
}
