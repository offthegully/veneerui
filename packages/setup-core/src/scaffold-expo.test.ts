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
  EXPO_SDK_TEMPLATE,
  expoDevInstallArgs,
} from './scaffold-expo';

const assetDir = fileURLToPath(new URL('../assets/expo/', import.meta.url));
const asset = (f: string): string => readFileSync(join(assetDir, f), 'utf8');

describe('buildExpoScaffoldCommand', () => {
  it('delegates to create-expo-app (SDK-pinned template), non-interactive, with -- for npm', () => {
    expect(buildExpoScaffoldCommand('npm', 'my-app')).toEqual({
      cmd: 'npm',
      args: ['create', 'expo-app@latest', 'my-app', '--', '--yes', '--template', EXPO_SDK_TEMPLATE],
    });
    expect(buildExpoScaffoldCommand('pnpm', 'my-app').args).toEqual([
      'create',
      'expo-app@latest',
      'my-app',
      '--yes',
      '--template',
      EXPO_SDK_TEMPLATE,
    ]);
    // pinned, not @latest — the newest SDK's Metro breaks NativeWind-v5-preview bundling
    expect(EXPO_SDK_TEMPLATE).toMatch(/@sdk-\d+$/);
  });

  it('uses a bare tool name for yarn (no @latest)', () => {
    expect(buildExpoScaffoldCommand('yarn', 'my-app').args[1]).toBe('expo-app');
  });

  // create-expo-app prompts for the SDK version in a TTY even with --template; --yes
  // takes the latest default so non-interactive/agent runs don't block or EOF-cancel.
  it('always passes --yes to create-expo-app', () => {
    for (const pm of ['npm', 'pnpm', 'yarn', 'bun'] as const) {
      expect(buildExpoScaffoldCommand(pm, 'my-app').args).toContain('--yes');
    }
  });

  it('appends --no-install when install is false', () => {
    expect(buildExpoScaffoldCommand('npm', 'a', false).args).toContain('--no-install');
    expect(buildExpoScaffoldCommand('npm', 'a', true).args).not.toContain('--no-install');
  });
});

describe('patchExpoPackageJson', () => {
  it('adds the entry and the codegen + typecheck scripts', () => {
    const out = patchExpoPackageJson({ scripts: { start: 'expo start' } }, 'npm');
    expect(out.main).toBe('index.ts');
    expect(out.scripts).toMatchObject({
      start: 'expo start', // preserved
      'gen:tokens': 'node scripts/generate-veneer-tokens.mjs',
      typecheck: 'tsc --noEmit',
    });
  });

  it('pins lightningcss under the key the package manager actually reads', () => {
    expect(patchExpoPackageJson({}, 'npm').overrides).toMatchObject({ lightningcss: '1.30.1' });
    expect(patchExpoPackageJson({}, 'bun').overrides).toMatchObject({ lightningcss: '1.30.1' });
    expect(patchExpoPackageJson({}, 'pnpm').pnpm?.overrides).toMatchObject({ lightningcss: '1.30.1' });
    expect(patchExpoPackageJson({}, 'yarn').resolutions).toMatchObject({ lightningcss: '1.30.1' });
    // npm-style override is NOT written for pnpm/yarn (they'd ignore it)
    expect(patchExpoPackageJson({}, 'pnpm').overrides).toBeUndefined();
    expect(patchExpoPackageJson({}, 'yarn').overrides).toBeUndefined();
  });

  it('is non-destructive to unrelated fields', () => {
    const out = patchExpoPackageJson({ name: 'x', dependencies: { expo: '~56' } }, 'npm');
    expect(out.name).toBe('x');
    expect(out.dependencies).toEqual({ expo: '~56' });
  });
});

describe('expo deps', () => {
  it('pins the NativeWind stack (not in Expo SDK map) and floats the SDK-managed deps', () => {
    // nativewind + react-native-css are EXACT-pinned — a caret on a prerelease still floats
    expect(EXPO_NATIVE_DEPS).toContain('nativewind@5.0.0-preview.4');
    expect(EXPO_NATIVE_DEPS).toContain('react-native-css@3.0.7');
    // SDK-managed deps stay unpinned so expo install matches the SDK
    expect(EXPO_NATIVE_DEPS).toContain('react-native-worklets'); // reanimated 4 peer
    expect(EXPO_NATIVE_DEPS).toContain('react-native-safe-area-context');
    // babel.config.js loads babel-preset-expo by bare name; it must be a direct dep
    // (npm may nest the transitive copy under expo/node_modules and Babel won't find it)
    expect(EXPO_NATIVE_DEPS).toContain('babel-preset-expo');
    expect(EXPO_DEV_DEPS).toContain('tailwindcss');
    expect(EXPO_DEV_DEPS).toContain('@offthegully/veneerui'); // the codegen's data source
  });

  // veneerui's web peers (react-dom/vite) are irrelevant on native, but npm auto-installs
  // the react-dom peer and ERESOLVE-fails against Expo's older pinned react. npm needs
  // --legacy-peer-deps to install this build-only dep; other PMs don't hard-enforce peers.
  it('passes --legacy-peer-deps only for npm', () => {
    expect(expoDevInstallArgs('npm')).toEqual([
      'install',
      '--save-dev',
      ...EXPO_DEV_DEPS,
      '--legacy-peer-deps',
    ]);
    for (const pm of ['pnpm', 'yarn', 'bun'] as const) {
      expect(expoDevInstallArgs(pm)).not.toContain('--legacy-peer-deps');
    }
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
