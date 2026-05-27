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

export const TOKENS_IMPORT = '@import "@veneer/theme/tokens.css";';

/**
 * Add the token @import to a Tailwind v4 global stylesheet, right after the
 * `@import "tailwindcss";` line (or at the top if that's absent).
 */
export function addTokensImport(css: string): PatchResult {
  if (css.includes('@veneer/theme/tokens.css')) return { content: css, changed: false };
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
  if (config.includes('@veneer/theme/vite')) return { content: config, changed: false };

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
    config.slice(0, insertAt) + `\nimport { veneer } from '@veneer/theme/vite'` + config.slice(insertAt);
  out = out.replace(/plugins:\s*\[/, (s) => `${s}veneer(), `);
  return { content: out, changed: true };
}

/** The Next.js <head> anti-flash snippet (printed by `init`, not auto-patched). */
export function nextAntiFlashSnippet(): string {
  return [
    "import { AntiFlashScript } from '@veneer/theme/next'",
    '',
    '// in app/layout.tsx, inside <html>:',
    '<head>',
    '  <AntiFlashScript />',
    '</head>',
  ].join('\n');
}

/** The client provider-wrapper snippet (printed by `init` for both frameworks). */
export function providerSnippet(framework: 'vite' | 'next'): string {
  if (framework === 'next') {
    return [
      '// app/providers.tsx',
      "'use client'",
      "import { ThemeProvider } from '@veneer/theme'",
      'export function Providers({ children }: { children: React.ReactNode }) {',
      '  return <ThemeProvider>{children}</ThemeProvider>',
      '}',
      '',
      '// then wrap {children} with <Providers> in app/layout.tsx',
    ].join('\n');
  }
  return [
    '// src/main.tsx',
    "import { ThemeProvider } from '@veneer/theme'",
    '',
    'createRoot(document.getElementById("root")!).render(',
    '  <StrictMode>',
    '    <ThemeProvider>',
    '      <App />',
    '    </ThemeProvider>',
    '  </StrictMode>,',
    ')',
  ].join('\n');
}
