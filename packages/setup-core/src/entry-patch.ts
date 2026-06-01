/**
 * Fresh-app entry patchers — the steps `init` deliberately refuses to apply to an
 * *existing* project (wrapping the root in `<ThemeProvider>`, the Next layout
 * head/provider wiring) become safe on a *freshly scaffolded* app, because the
 * entry files are pristine and version-known. `create-veneerui` uses these right
 * after delegating to the official scaffolder.
 *
 * Each follows the same contract as `patch.ts`: pure `(text) => PatchResult`,
 * idempotent (re-running is a no-op), and **anchor-or-bail** — if a file's shape
 * is unfamiliar it returns `changed: false` with a `reason`, and the caller falls
 * back to the manual `VENEER-SETUP.md` step (so a template reshape degrades to
 * "the agent finishes it" instead of a mangled file).
 */
import type { PatchResult } from './patch';

/** Insert a line right after the last top-level `import …` (or prepend if none). */
function insertAfterLastImport(src: string, line: string): string {
  const importRe = /^import .*$/gm;
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(src))) last = m;
  if (!last) return `${line}\n${src}`;
  const at = last.index + last[0].length;
  return `${src.slice(0, at)}\n${line}${src.slice(at)}`;
}

/**
 * Wrap a Vite entry's root element in `<ThemeProvider>`. Targets the create-vite
 * `react-ts` shape (`createRoot(...).render(<StrictMode><App /></StrictMode>)`),
 * but preserves whatever indentation `<App />` had so other shapes stay tidy.
 */
export function wrapEntryWithProvider(src: string): PatchResult {
  if (src.includes('ThemeProvider')) return { content: src, changed: false };
  if (!/<App\s*\/>/.test(src)) {
    return { content: src, changed: false, reason: 'no <App /> element found in the entry' };
  }
  let out = insertAfterLastImport(src, "import { ThemeProvider } from '@offthegully/veneerui'");
  const lineAnchored = /^([ \t]*)<App\s*\/>/m;
  if (lineAnchored.test(out)) {
    out = out.replace(
      lineAnchored,
      (_m, indent: string) => `${indent}<ThemeProvider>\n${indent}  <App />\n${indent}</ThemeProvider>`,
    );
  } else {
    out = out.replace(/<App\s*\/>/, '<ThemeProvider><App /></ThemeProvider>');
  }
  return { content: out, changed: true };
}

/**
 * The client `app/providers.tsx` for a Next App Router app — a new file, so this
 * is a generator, not a patcher. Mirrors `providerSnippet('next', …)` from
 * `patch.ts` minus the explanatory comments.
 */
export function createNextProviders(): string {
  return [
    "'use client'",
    '',
    "import { ThemeProvider } from '@offthegully/veneerui'",
    '',
    'export function Providers({ children }: { children: React.ReactNode }) {',
    '  return <ThemeProvider>{children}</ThemeProvider>',
    '}',
    '',
  ].join('\n');
}

/**
 * Wire a Next App Router `app/layout.tsx`: import the client `Providers` and the
 * anti-flash script, add `suppressHydrationWarning` to `<html>` (REQUIRED — the
 * script mutates `<html>` before hydration), render `<AntiFlashScript/>` in
 * `<head>`, and wrap the body's `{children}` in `<Providers>`. Each edit is
 * guarded independently so a re-run is a no-op. Bails (→ manual plan) if the
 * structural anchors (`<html>` and a JSX `{children}`) aren't found.
 */
export function wireNextLayout(src: string): PatchResult {
  if (!/<html[\s>]/.test(src)) {
    return { content: src, changed: false, reason: 'no <html> element found in the layout' };
  }
  // The body usage is a JSX child (`>{children}`); the destructured prop
  // (`{ children }` / `{\n  children,\n}`) is NOT preceded by `>`, so anchoring
  // on a preceding `>` targets the body and never the function parameter.
  if (!/>\s*\{children\}/.test(src)) {
    return { content: src, changed: false, reason: 'no {children} JSX child found in the layout body' };
  }

  let out = src;
  if (!/from ['"]\.\/providers['"]/.test(out)) {
    out = insertAfterLastImport(out, "import { Providers } from './providers'");
  }
  if (!out.includes('@offthegully/veneerui/next')) {
    out = insertAfterLastImport(out, "import { AntiFlashScript } from '@offthegully/veneerui/next'");
  }
  if (!/<html[^>]*\bsuppressHydrationWarning\b/.test(out)) {
    out = out.replace(/<html(\s[^>]*?)?>/, (_m, attrs: string | undefined) => `<html${attrs ?? ''} suppressHydrationWarning>`);
  }
  if (!/<AntiFlashScript\s*\/>/.test(out)) {
    if (/<head\b[^>]*>/.test(out)) {
      out = out.replace(/<head\b[^>]*>/, (m) => `${m}\n        <AntiFlashScript />`);
    } else {
      out = out.replace(/(<html[^>]*>)/, (m) => `${m}\n      <head>\n        <AntiFlashScript />\n      </head>`);
    }
  }
  if (!/<Providers>/.test(out)) {
    out = out.replace(/>(\s*)\{children\}/, (_m, gap: string) => `>${gap}<Providers>{children}</Providers>`);
  }
  return { content: out, changed: out !== src };
}

/**
 * Add Tailwind v4's Vite plugin to a Vite config (create-vite's `react-ts`
 * template ships no Tailwind). Kept separate from the `veneer()` anti-flash
 * plugin (`addViteAntiFlash` in `patch.ts`) so the two concerns stay
 * independently testable; both prepend to `plugins: [`.
 */
export function addTailwindVite(config: string): PatchResult {
  if (config.includes('@tailwindcss/vite')) return { content: config, changed: false };
  if (!/plugins:\s*\[/.test(config)) {
    return { content: config, changed: false, reason: 'no `plugins: [` array found in the vite config' };
  }
  let out = insertAfterLastImport(config, "import tailwindcss from '@tailwindcss/vite'");
  out = out.replace(/plugins:\s*\[/, (s) => `${s}tailwindcss(), `);
  return { content: out, changed: true };
}
