import { describe, expect, it } from 'vitest';
import { SETUP_PROMPT, buildAgentCommand, resolveAgent } from './agent';

describe('SETUP_PROMPT', () => {
  it('names the setup file so the agent (or a human) knows what to finish', () => {
    expect(SETUP_PROMPT).toContain('VENEER-SETUP.md');
    expect(SETUP_PROMPT).toMatch(/verify/i);
  });

  it('verifies via typecheck/build, not a dev server (which never exits and hangs the run)', () => {
    expect(SETUP_PROMPT).toMatch(/build/i);
    // It must explicitly steer the agent away from the blocking dev server.
    expect(SETUP_PROMPT).toMatch(/do not start the dev server/i);
    expect(SETUP_PROMPT).toMatch(/npm run dev/);
  });
});

describe('buildAgentCommand', () => {
  it('builds the headless claude invocation with auto-accepted edits (no --bare by default)', () => {
    const { cmd, args } = buildAgentCommand('claude', 'do the thing');
    expect(cmd).toBe('claude');
    expect(args).toEqual([
      '-p',
      'do the thing',
      '--permission-mode',
      'acceptEdits',
      '--allowedTools',
      'Read,Edit,Bash',
    ]);
    // bare mode skips OAuth/keychain — off by default so subscription logins work.
    expect(args).not.toContain('--bare');
  });

  it('adds --bare only when explicitly opted in (an API key is present)', () => {
    const { args } = buildAgentCommand('claude', 'do the thing', { bare: true });
    expect(args).toContain('--bare');
  });

  it('builds the codex exec invocation in a workspace-write sandbox', () => {
    const { cmd, args } = buildAgentCommand('codex', 'do the thing');
    expect(cmd).toBe('codex');
    expect(args).toEqual(['exec', 'do the thing', '--sandbox', 'workspace-write']);
  });

  it('adds --skip-git-repo-check for codex when the project has no git', () => {
    const { args } = buildAgentCommand('codex', 'x', { noGit: true });
    expect(args).toContain('--skip-git-repo-check');
  });

  it('passes the prompt as a single argv element (no shell interpolation)', () => {
    const tricky = 'finish setup; rm -rf / # "$(whoami)"';
    expect(buildAgentCommand('claude', tricky).args).toContain(tricky);
    expect(buildAgentCommand('codex', tricky).args).toContain(tricky);
  });
});

describe('resolveAgent', () => {
  const yes = () => true;
  const no = () => false;
  const only = (name: string) => (bin: string) => bin === name;

  it('auto prefers claude, then codex', () => {
    expect(resolveAgent('auto', yes)).toBe('claude');
    expect(resolveAgent('auto', only('codex'))).toBe('codex');
    expect(resolveAgent('auto', no)).toBe(null);
  });

  it('honors an explicit choice, but only if installed', () => {
    expect(resolveAgent('claude', only('claude'))).toBe('claude');
    expect(resolveAgent('claude', no)).toBe(null);
    expect(resolveAgent('codex', only('codex'))).toBe('codex');
    expect(resolveAgent('codex', only('claude'))).toBe(null);
  });
});
