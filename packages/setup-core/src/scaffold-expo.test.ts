import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildExpoScaffoldCommand,
  patchExpoPackageJson,
  EXPO_TEMPLATE_FILES,
  EXPO_NATIVE_DEPS,
  EXPO_DEV_DEPS,
} from './scaffold-expo';

const assetDir = fileURLToPath(new URL('../assets/expo/', import.meta.url));
const asset = (f: string): string => readFileSync(join(assetDir, f), 'utf8');

describe('buildExpoScaffoldCommand', () => {
  it('delegates to create-expo-app (blank-typescript), with -- for npm', () => {
    expect(buildExpoScaffoldCommand('npm', 'my-app')).toEqual({
      cmd: 'npm',
      args: ['create', 'expo-app@latest', 'my-app', '--', '--template', 'blank-typescript'],
    });
    expect(buildExpoScaffoldCommand('pnpm', 'my-app').args).toEqual([
      'create',
      'expo-app@latest',
      'my-app',
      '--template',
      'blank-typescript',
    ]);
  });

  it('uses a bare tool name for yarn (no @latest)', () => {
    expect(buildExpoScaffoldCommand('yarn', 'my-app').args[1]).toBe('expo-app');
  });

  it('appends --no-install when install is false', () => {
    expect(buildExpoScaffoldCommand('npm', 'a', false).args).toContain('--no-install');
    expect(buildExpoScaffoldCommand('npm', 'a', true).args).not.toContain('--no-install');
  });
});

describe('patchExpoPackageJson', () => {
  it('adds the entry, codegen + typecheck scripts, and the lightningcss pin', () => {
    const out = patchExpoPackageJson({ scripts: { start: 'expo start' } });
    expect(out.main).toBe('index.ts');
    expect(out.scripts).toMatchObject({
      start: 'expo start', // preserved
      'gen:tokens': 'node scripts/generate-veneer-tokens.mjs',
      typecheck: 'tsc --noEmit',
    });
    expect(out.overrides).toMatchObject({ lightningcss: '1.30.1' });
  });

  it('is non-destructive to unrelated fields', () => {
    const out = patchExpoPackageJson({ name: 'x', dependencies: { expo: '~56' } });
    expect(out.name).toBe('x');
    expect(out.dependencies).toEqual({ expo: '~56' });
  });
});

describe('expo deps', () => {
  it('installs the NativeWind + RN stack natively and the Tailwind toolchain as dev', () => {
    expect(EXPO_NATIVE_DEPS).toContain('nativewind');
    expect(EXPO_NATIVE_DEPS).toContain('react-native-worklets'); // reanimated 4 peer
    expect(EXPO_DEV_DEPS).toContain('tailwindcss');
    expect(EXPO_DEV_DEPS).toContain('@offthegully/veneerui'); // the codegen's data source
  });
});

describe('expo templates', () => {
  it('every manifest entry resolves to a non-empty asset', () => {
    for (const { asset: file } of EXPO_TEMPLATE_FILES) {
      expect(asset(file).length, file).toBeGreaterThan(0);
    }
  });

  it('the App starter uses only token utilities — no hardcoded colors', () => {
    const app = asset('App.tsx');
    expect(app).toContain('bg-surface');
    expect(app).toContain('text-text');
    expect(app).not.toMatch(/bg-(?:blue|red|gray|green|black|white)-?\d*/);
    expect(app).not.toMatch(/#[0-9a-fA-F]{3,6}/); // no literal hex
  });

  it('the codegen reads the published Veneer data slice', () => {
    const gen = asset('gen-veneer-tokens.mjs');
    expect(gen).toContain('@offthegully/veneerui/themes');
    expect(gen).toContain('TOKEN_SCHEMA');
    expect(gen).toContain('BUILTIN_THEMES');
  });

  it('the codegen encodes the two NativeWind gotchas (layered imports + tokens in :root)', () => {
    const gen = asset('gen-veneer-tokens.mjs');
    // 1. layered imports, NOT the `@import "tailwindcss"` bundle
    expect(gen).toContain('@import "tailwindcss/theme.css" layer(theme)');
    expect(gen).not.toContain('@import "tailwindcss";');
    // 2. :root emits EVERY token (theme-bridge repeated), not just root-bridge ones
    expect(gen).toContain(':root {');
    expect(gen).toContain('TOKEN_SCHEMA.map(line)');
  });
});
