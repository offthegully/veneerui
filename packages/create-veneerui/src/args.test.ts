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

  it('negation + boolean flags', () => {
    const p = parse(['app', '--no-install', '--yes']);
    expect(p).toMatchObject({ name: 'app', install: false, yes: true });
    expect(parse(['--defaults']).yes).toBe(true);
    expect(parse(['-h']).help).toBe(true);
    expect(parse(['-v']).version).toBe(true);
  });
});

describe('validateName', () => {
  it('accepts a clean name', () => {
    expect(validateName('my-veneer-app')).toBeUndefined();
    expect(validateName('App_2.0')).toBeUndefined();
  });

  it('rejects empty or whitespace', () => {
    expect(validateName('')).toMatch(/enter a project name/i);
    expect(validateName('   ')).toMatch(/enter a project name/i);
  });

  it('rejects spaces and unsafe characters', () => {
    expect(validateName('my app')).toMatch(/letters/i);
    expect(validateName('a/b')).toMatch(/letters/i);
  });
});
