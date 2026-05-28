import { describe, expect, it } from 'vitest';
import { addTokensImport, addViteAntiFlash, providerSnippet, TOKENS_IMPORT } from './patch';

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
