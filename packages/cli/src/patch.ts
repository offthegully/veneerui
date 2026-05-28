/**
 * Idempotent, string-based file patchers used by `init`. Each is pure — it takes
 * source text and returns the new text plus whether it changed — so they're
 * fully unit-testable and `--dry-run` is free. They only edit when they can find
 * a confident anchor; if a file's shape is unfamiliar, they report `changed:
 * false` and the caller prints the manual snippet instead of guessing.
 */

export interface PatchResult {
  content: string;
  changed: boolean;
  /** Set when no safe edit was possible, so the caller can fall back to a manual hint. */
  reason?: string;
}

export const TOKENS_IMPORT = '@import "@offthegully/veneerui/tokens.css";';

/**
 * Add the token @import to a Tailwind v4 global stylesheet, right after the
 * `@import "tailwindcss";` line (or at the top if that's absent).
 */
export function addTokensImport(css: string): PatchResult {
  if (css.includes('@offthegully/veneerui/tokens.css')) return { content: css, changed: false };
  const lines = css.split('\n');
  const twIdx = lines.findIndex((l) => /@import\s+["']tailwindcss["']/.test(l));
  if (twIdx >= 0) {
    lines.splice(twIdx + 1, 0, TOKENS_IMPORT);
    return { content: lines.join('\n'), changed: true };
  }
  return { content: `${TOKENS_IMPORT}\n${css}`, changed: true };
}

/**
 * Add the veneer() anti-flash plugin to a Vite config: an import line after the
 * last existing import, and `veneer()` at the front of the `plugins: [` array.
 */
export function addViteAntiFlash(config: string): PatchResult {
  if (config.includes('@offthegully/veneerui/vite')) return { content: config, changed: false };

  const importRe = /^import .*$/gm;
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(config))) last = m;
  if (!last) {
    return { content: config, changed: false, reason: 'no import statements found in vite config' };
  }
  if (!/plugins:\s*\[/.test(config)) {
    return { content: config, changed: false, reason: 'no `plugins: [` array found in vite config' };
  }

  const insertAt = last.index + last[0].length;
  let out =
    config.slice(0, insertAt) + `\nimport { veneer } from '@offthegully/veneerui/vite'` + config.slice(insertAt);
  out = out.replace(/plugins:\s*\[/, (s) => `${s}veneer(), `);
  return { content: out, changed: true };
}

/** The Next.js <head> anti-flash snippet (printed by `init`, not auto-patched). */
export function nextAntiFlashSnippet(): string {
  return [
    "import { AntiFlashScript } from '@offthegully/veneerui/next'",
    '',
    '// in app/layout.tsx, inside <html>:',
    '<head>',
    '  <AntiFlashScript />',
    '</head>',
  ].join('\n');
}

/**
 * The "ship your own themes" hint appended to the provider snippet. The default
 * wiring uses Veneer's built-ins (zero config); this shows how to supply your
 * own set, and where to pass the same default so there's no first-paint flash.
 */
function customThemesHint(framework: 'vite' | 'next'): string[] {
  const antiFlash =
    framework === 'next'
      ? '//   app/layout.tsx: <AntiFlashScript defaultTheme={themes[0]} />'
      : '//   vite.config: veneer({ defaultTheme: themes[0] })';
  return [
    '',
    '// To ship your own themes instead of the built-ins, define them once and',
    '// pass them in — then pass the same default to the anti-flash wiring so a',
    '// first-ever visit paints your default with no flash:',
    "//   import { defineTheme } from '@offthegully/veneerui'",
    "//   const themes = [defineTheme({ id: 'brand', name: 'Brand', tokens: { /* ... */ } })]",
    '//   <ThemeProvider themes={themes} defaultThemeId="brand">',
    antiFlash,
  ];
}

/** The client provider-wrapper snippet (printed by `init` for both frameworks). */
export function providerSnippet(framework: 'vite' | 'next'): string {
  if (framework === 'next') {
    return [
      '// app/providers.tsx',
      "'use client'",
      "import { ThemeProvider } from '@offthegully/veneerui'",
      'export function Providers({ children }: { children: React.ReactNode }) {',
      '  return <ThemeProvider>{children}</ThemeProvider>',
      '}',
      '',
      '// then wrap {children} with <Providers> in app/layout.tsx',
      ...customThemesHint('next'),
    ].join('\n');
  }
  return [
    '// src/main.tsx',
    "import { ThemeProvider } from '@offthegully/veneerui'",
    '',
    'createRoot(document.getElementById("root")!).render(',
    '  <StrictMode>',
    '    <ThemeProvider>',
    '      <App />',
    '    </ThemeProvider>',
    '  </StrictMode>,',
    ')',
    ...customThemesHint('vite'),
  ].join('\n');
}
