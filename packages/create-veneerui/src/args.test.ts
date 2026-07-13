import { describe, expect, it } from 'vitest';
import { parse, validateName } from './args';

describe('parse', () => {
  it('defaults: install on, nothing else set', () => {
    const p = parse([]);
    expect(p).toMatchObject({ install: true, yes: false, dryRun: false });
    expect(p.name).toBeUndefined();
    expect(p.framework).toBeUndefined();
    expect(p.agent).toBeUndefined();
  });

  it('takes the first non-flag as the project name', () => {
    expect(parse(['my-app']).name).toBe('my-app');
    expect(parse(['--dry-run', 'my-app', 'ignored']).name).toBe('my-app');
  });

  it('parses framework and pm in both = and space forms', () => {
    expect(parse(['--framework=next']).framework).toBe('next');
    expect(parse(['--framework', 'vite']).framework).toBe('vite');
    expect(parse(['--pm=pnpm']).pm).toBe('pnpm');
    expect(parse(['--pm', 'bun']).pm).toBe('bun');
  });

  it('handles --agent bare (auto) and with a value', () => {
    expect(parse(['--agent']).agent).toBe('auto');
    expect(parse(['--agent=claude']).agent).toBe('claude');
    expect(parse(['--agent=codex']).agent).toBe('codex');
  });

  it('--agent=none explicitly skips the handoff (valid, sets nothing)', () => {
    const p = parse(['--agent=none']);
    expect(p.agent).toBeUndefined();
    expect(p.error).toBeUndefined();
  });

  it('negation + boolean flags', () => {
    const p = parse(['app', '--no-install', '--yes']);
    expect(p).toMatchObject({ name: 'app', install: false, yes: true });
    expect(parse(['--defaults']).yes).toBe(true);
    expect(parse(['-h']).help).toBe(true);
    expect(parse(['-v']).version).toBe(true);
  });

  it('known flags never set an error', () => {
    expect(parse(['app', '--yes', '--dry-run', '--pm', 'pnpm', '--agent=claude']).error).toBeUndefined();
  });

  it('errors on an unknown flag, with a did-you-mean for a close misspelling', () => {
    expect(parse(['--framwork', 'next']).error).toMatch(/did you mean `--framework`/);
    expect(parse(['--no-instal']).error).toMatch(/did you mean `--no-install`/);
    // nothing close → list the valid flags instead of silently dropping it
    expect(parse(['--wat']).error).toMatch(/Valid flags: .*--framework/);
  });

  it('errors on an invalid --agent value instead of blind-casting it', () => {
    // a blind cast fell through resolveAgent's `auto` path and launched Claude
    expect(parse(['--agent=cursor']).error).toMatch(/expected claude, codex, auto, or none/);
    expect(parse(['--agent=cursor']).agent).toBeUndefined();
  });

  it('errors on an invalid or missing --pm value instead of silently ignoring it', () => {
    expect(parse(['--pm', 'brew']).error).toMatch(/expected npm, pnpm, yarn, or bun/);
    expect(parse(['--pm=deno']).error).toMatch(/expected npm, pnpm, yarn, or bun/);
    expect(parse(['--pm']).error).toMatch(/requires a value/);
  });

  it('keeps the first error when several flags are bad', () => {
    expect(parse(['--pm', 'brew', '--wat']).error).toMatch(/--pm/);
  });
});

describe('validateName', () => {
  it('accepts a clean name', () => {
    expect(validateName('my-veneer-app')).toBeUndefined();
    expect(validateName('app_2.0')).toBeUndefined();
  });

  it('rejects empty or whitespace', () => {
    expect(validateName('')).toMatch(/enter a project name/i);
    expect(validateName('   ')).toMatch(/enter a project name/i);
  });

  // create-next-app hard-fails on capitals mid-flow (Vite/Expo accept them) —
  // reject up front, and hand the user the name that would have worked.
  it('rejects uppercase and suggests the lowercased name', () => {
    expect(validateName('App_2.0')).toMatch(/"app_2\.0"/);
    expect(validateName('MyApp')).toMatch(/lowercase/i);
  });

  it('rejects spaces and unsafe characters', () => {
    expect(validateName('my app')).toMatch(/letters/i);
    expect(validateName('a/b')).toMatch(/letters/i);
  });
});
