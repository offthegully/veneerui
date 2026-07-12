import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  detectPm,
  execHint,
  installArgs,
  installHint,
  isPackageManager,
  resolvePm,
  runHint,
} from './pm';

describe('resolvePm (scaffold: from npm_config_user_agent)', () => {
  it('reads the package manager from npm_config_user_agent', () => {
    expect(resolvePm('pnpm/9.0.0 npm/? node/v20')).toBe('pnpm');
    expect(resolvePm('yarn/1.22.0 npm/?')).toBe('yarn');
    expect(resolvePm('bun/1.1.0')).toBe('bun');
    expect(resolvePm('npm/10.0.0 node/v20')).toBe('npm');
  });

  it('falls back to npm for an unknown or missing agent', () => {
    expect(resolvePm(undefined)).toBe('npm');
    expect(resolvePm('deno/1.0')).toBe('npm');
  });

  it('lets an explicit override win', () => {
    expect(resolvePm('pnpm/9', 'bun')).toBe('bun');
    expect(resolvePm('pnpm/9', 'not-a-pm')).toBe('pnpm');
  });

  it('validates package-manager names', () => {
    expect(isPackageManager('pnpm')).toBe(true);
    expect(isPackageManager('cargo')).toBe(false);
    expect(isPackageManager(undefined)).toBe(false);
  });
});

describe('detectPm (init: from the existing project)', () => {
  const dirs: string[] = [];
  function tmpProject(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'veneer-pm-'));
    dirs.push(dir);
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
    return dir;
  }
  afterEach(() => {
    while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
  });

  it('detects from each lockfile', () => {
    expect(detectPm(tmpProject({ 'pnpm-lock.yaml': '' }))).toBe('pnpm');
    expect(detectPm(tmpProject({ 'yarn.lock': '' }))).toBe('yarn');
    expect(detectPm(tmpProject({ 'bun.lock': '' }))).toBe('bun');
    expect(detectPm(tmpProject({ 'bun.lockb': '' }))).toBe('bun');
    expect(detectPm(tmpProject({ 'package-lock.json': '{}' }))).toBe('npm');
  });

  it("prefers corepack's packageManager field over any lockfile", () => {
    const dir = tmpProject({
      'package.json': JSON.stringify({ packageManager: 'pnpm@9.1.0' }),
      'package-lock.json': '{}', // straggler that should lose
    });
    expect(detectPm(dir)).toBe('pnpm');
  });

  it('lets an intentional lockfile win over a leftover package-lock.json', () => {
    expect(detectPm(tmpProject({ 'pnpm-lock.yaml': '', 'package-lock.json': '{}' }))).toBe('pnpm');
  });

  it('falls back to npm with no signal', () => {
    expect(detectPm(tmpProject({}))).toBe('npm');
    expect(detectPm(tmpProject({ 'package.json': '{}' }))).toBe('npm');
  });
});

describe('installArgs (spawn argv)', () => {
  it('uses `npm install` / `<pm> add`', () => {
    expect(installArgs('npm', ['x'])).toEqual(['install', 'x']);
    expect(installArgs('pnpm', ['x'])).toEqual(['add', 'x']);
    expect(installArgs('yarn', ['x'])).toEqual(['add', 'x']);
    expect(installArgs('bun', ['x'])).toEqual(['add', 'x']);
  });

  it('threads the dev flag per package manager', () => {
    expect(installArgs('npm', ['x'], true)).toEqual(['install', '--save-dev', 'x']);
    expect(installArgs('pnpm', ['x'], true)).toEqual(['add', '-D', 'x']);
    expect(installArgs('bun', ['x'], true)).toEqual(['add', '-d', 'x']);
  });
});

describe('the *Hint string helpers (instruction text)', () => {
  it('installHint: `npm i` vs `<pm> add`, with the right dev flag', () => {
    expect(installHint('npm', ['a', 'b'])).toBe('npm i a b');
    expect(installHint('npm', ['a'], true)).toBe('npm i -D a');
    expect(installHint('pnpm', ['a'])).toBe('pnpm add a');
    expect(installHint('pnpm', ['a'], true)).toBe('pnpm add -D a');
    expect(installHint('yarn', ['a'], true)).toBe('yarn add -D a');
    expect(installHint('bun', ['a'], true)).toBe('bun add -d a');
  });

  it('runHint: `npm run <s>` vs `<pm> <s>`', () => {
    expect(runHint('npm', 'dev')).toBe('npm run dev');
    expect(runHint('pnpm', 'dev')).toBe('pnpm dev');
    expect(runHint('yarn', 'build')).toBe('yarn build');
    expect(runHint('bun', 'typecheck')).toBe('bun typecheck');
  });

  it('execHint: the package-runner per manager', () => {
    expect(execHint('npm', 'veneerui add switcher')).toBe('npx veneerui add switcher');
    expect(execHint('pnpm', 'veneerui init')).toBe('pnpm dlx veneerui init');
    expect(execHint('yarn', 'veneerui init')).toBe('yarn dlx veneerui init');
    expect(execHint('bun', 'veneerui init')).toBe('bunx veneerui init');
  });
});
