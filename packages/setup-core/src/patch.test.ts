import { describe, expect, it } from 'vitest';
import {
  addEslintRule,
  addTokensImport,
  addViteAntiFlash,
  nextAntiFlashSnippet,
  providerSnippet,
  TOKENS_IMPORT,
} from './patch';

describe('addTokensImport', () => {
  it('inserts the token @import right after the tailwindcss import', () => {
    const out = addTokensImport('@import "tailwindcss";\nhtml { color: red; }');
    expect(out.changed).toBe(true);
    expect(out.content).toBe(`@import "tailwindcss";\n${TOKENS_IMPORT}\nhtml { color: red; }`);
  });

  it('prepends when there is no tailwindcss import', () => {
    const out = addTokensImport('body{}');
    expect(out.changed).toBe(true);
    expect(out.content.startsWith(TOKENS_IMPORT)).toBe(true);
  });

  it('is idempotent', () => {
    const once = addTokensImport('@import "tailwindcss";\n').content;
    const twice = addTokensImport(once);
    expect(twice.changed).toBe(false);
    expect(twice.content).toBe(once);
  });
});

describe('addViteAntiFlash', () => {
  const config = [
    "import { defineConfig } from 'vite'",
    "import react from '@vitejs/plugin-react'",
    "import tailwindcss from '@tailwindcss/vite'",
    '',
    'export default defineConfig({',
    '  plugins: [react(), tailwindcss()],',
    '})',
    '',
  ].join('\n');

  it('adds the import and the plugin call', () => {
    const out = addViteAntiFlash(config);
    expect(out.changed).toBe(true);
    expect(out.content).toContain("import { veneer } from '@offthegully/veneerui/vite'");
    expect(out.content).toMatch(/plugins:\s*\[veneer\(\), react\(\), tailwindcss\(\)\]/);
  });

  it('is idempotent', () => {
    const once = addViteAntiFlash(config).content;
    const twice = addViteAntiFlash(once);
    expect(twice.changed).toBe(false);
    expect(twice.content).toBe(once);
  });

  it('refuses to edit an unfamiliar config and explains why', () => {
    const out = addViteAntiFlash('export default {}');
    expect(out.changed).toBe(false);
    expect(out.reason).toBeTruthy();
  });
});

describe('addEslintRule', () => {
  const viteConfig = [
    "import js from '@eslint/js'",
    "import { defineConfig, globalIgnores } from 'eslint/config'",
    '',
    'export default defineConfig([',
    "  globalIgnores(['dist']),",
    '])',
    '',
  ].join('\n');

  const nextConfig = [
    'import { FlatCompat } from "@eslint/eslintrc";',
    'const compat = new FlatCompat({ baseDirectory: "." });',
    '',
    'const eslintConfig = [',
    '  ...compat.extends("next/core-web-vitals", "next/typescript"),',
    '];',
    'export default eslintConfig;',
    '',
  ].join('\n');

  it('adds the import and the preset to a create-vite flat config', () => {
    const out = addEslintRule(viteConfig);
    expect(out.changed).toBe(true);
    expect(out.content).toContain("import veneer from 'eslint-plugin-veneer'");
    expect(out.content).toMatch(/defineConfig\(\[\n\s*veneer\.configs\.recommended,/);
  });

  it('adds the preset to a create-next-app flat config', () => {
    const out = addEslintRule(nextConfig);
    expect(out.changed).toBe(true);
    expect(out.content).toContain("import veneer from 'eslint-plugin-veneer'");
    expect(out.content).toMatch(/const eslintConfig = \[\n\s*veneer\.configs\.recommended,/);
  });

  // The current create-next-app wraps the array in defineConfig() from "eslint/config".
  const nextConfigDefineConfig = [
    'import { defineConfig, globalIgnores } from "eslint/config";',
    'import nextVitals from "eslint-config-next/core-web-vitals";',
    'import nextTs from "eslint-config-next/typescript";',
    '',
    'const eslintConfig = defineConfig([',
    '  ...nextVitals,',
    '  ...nextTs,',
    '  globalIgnores([".next/**"]),',
    ']);',
    'export default eslintConfig;',
    '',
  ].join('\n');

  it('adds the preset to the current create-next-app defineConfig() flat config', () => {
    const out = addEslintRule(nextConfigDefineConfig);
    expect(out.changed).toBe(true);
    expect(out.content).toContain("import veneer from 'eslint-plugin-veneer'");
    expect(out.content).toMatch(/const eslintConfig = defineConfig\(\[\n\s*veneer\.configs\.recommended,/);
  });

  it('is idempotent', () => {
    const once = addEslintRule(viteConfig).content;
    const twice = addEslintRule(once);
    expect(twice.changed).toBe(false);
    expect(twice.content).toBe(once);
  });

  it('refuses to edit an unfamiliar config and explains why', () => {
    const out = addEslintRule('module.exports = { rules: {} }');
    expect(out.changed).toBe(false);
    expect(out.reason).toBeTruthy();
  });
});

describe('nextAntiFlashSnippet', () => {
  it('renders the AntiFlashScript inside <head>', () => {
    const out = nextAntiFlashSnippet();
    expect(out).toContain("import { AntiFlashScript } from '@offthegully/veneerui/next'");
    expect(out).toContain('<AntiFlashScript />');
  });

  it('requires suppressHydrationWarning on <html> (the script mutates it pre-hydration)', () => {
    const out = nextAntiFlashSnippet();
    expect(out).toContain('suppressHydrationWarning');
    expect(out).toMatch(/<html[^>]*suppressHydrationWarning/);
  });
});

describe('providerSnippet', () => {
  it('keeps the zero-config <ThemeProvider> as the default wiring', () => {
    expect(providerSnippet('vite')).toContain('<ThemeProvider>');
    expect(providerSnippet('next')).toContain('<ThemeProvider>{children}</ThemeProvider>');
  });

  it('hints how to ship your own themes with matching anti-flash wiring', () => {
    const vite = providerSnippet('vite');
    expect(vite).toContain('defineTheme');
    expect(vite).toContain('defaultThemeId="brand"');
    expect(vite).toContain('veneer({ defaultTheme: themes[0] })');

    const next = providerSnippet('next');
    expect(next).toContain('defineTheme');
    expect(next).toContain('<AntiFlashScript defaultTheme={themes[0]} />');
  });
});
