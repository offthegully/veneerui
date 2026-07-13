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
  if (src.includes('ThemeProvider')) {
    // Ours ⇒ already wired (idempotent no-op). Another library's (next-themes, …)
    // ⇒ bail: importing a second `ThemeProvider` identifier would not compile, and
    // silently counting it as wired is how theming "doesn't work" with a ✓ log.
    return src.includes('@offthegully/veneerui')
      ? { content: src, changed: false }
      : {
          content: src,
          changed: false,
          reason: "a ThemeProvider from another library is already in the entry — nest Veneer's provider inside it manually",
        };
  }
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
 * Wire a generic **SSR root document** — the shape React Router 7's `app/root.tsx`
 * `Layout`, TanStack Start's `__root.tsx` `RootDocument`, and most SSR roots share:
 * an `<html>` whose `<head>` and `<body>{children}` are rendered by the framework.
 * Unlike Next, these have no RSC boundary, so we don't need a `'use client'`
 * providers file or the `/next` adapter — we import `ThemeProvider` +
 * `getAntiFlashScript` directly and:
 *   1. add `suppressHydrationWarning` to `<html>` (the script mutates it pre-hydration),
 *   2. inline the anti-flash `<script>` in `<head>` (RR7/TanStack have no index.html,
 *      so the Vite `veneer()` plugin can't inject it),
 *   3. wrap the body's `{children}` in `<ThemeProvider>`.
 * Each edit is guarded independently (idempotent); bails (→ manual plan) if the
 * structural anchors (`<html>` and a JSX `{children}`) aren't found.
 */
export function wireSsrRoot(src: string): PatchResult {
  // A foreign ThemeProvider (next-themes, …): importing a second `ThemeProvider`
  // identifier would not compile, and the `<ThemeProvider>` wrap guard below would
  // mistake it for ours — bail to the manual step instead.
  if (src.includes('ThemeProvider') && !src.includes('@offthegully/veneerui')) {
    return {
      content: src,
      changed: false,
      reason: "a ThemeProvider from another library is already in the root document — nest Veneer's provider inside it manually",
    };
  }
  if (!/<html[\s>]/.test(src)) {
    return { content: src, changed: false, reason: 'no <html> element found in the root document' };
  }
  // A JSX child (`>{children}`), not the destructured prop (`{ children }`), which
  // is never preceded by `>`. Anchoring on the preceding `>` targets the body.
  if (!/>\s*\{children\}/.test(src)) {
    return { content: src, changed: false, reason: 'no {children} JSX child found in the root document' };
  }

  let out = src;
  if (!out.includes('getAntiFlashScript')) {
    out = insertAfterLastImport(
      out,
      "import { ThemeProvider, getAntiFlashScript } from '@offthegully/veneerui'",
    );
  }
  if (!/<html[^>]*\bsuppressHydrationWarning\b/.test(out)) {
    out = out.replace(
      /<html(\s[^>]*?)?>/,
      (_m, attrs: string | undefined) => `<html${attrs ?? ''} suppressHydrationWarning>`,
    );
  }
  // The anti-flash script: a synchronous inline <script> in <head>. React 19 may
  // hoist it below sibling <meta>/<title>, but it still lands before the
  // render-blocking stylesheet <link>, so it runs before first paint — no flash.
  const scriptTag = '<script dangerouslySetInnerHTML={{ __html: getAntiFlashScript() }} />';
  if (!out.includes('getAntiFlashScript()')) {
    if (/<head\b[^>]*>/.test(out)) {
      out = out.replace(/<head\b[^>]*>/, (m) => `${m}\n        ${scriptTag}`);
    } else {
      out = out.replace(/(<html[^>]*>)/, (m) => `${m}\n      <head>\n        ${scriptTag}\n      </head>`);
    }
  }
  if (!/<ThemeProvider>/.test(out)) {
    out = out.replace(
      />(\s*)\{children\}/,
      (_m, gap: string) => `>${gap}<ThemeProvider>{children}</ThemeProvider>`,
    );
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

/**
 * Remove create-next-app's `next/font` (Geist) wiring from `app/layout.tsx`. A
 * framework font pinned on the document overrides Veneer's `font-sans` token and
 * **silently disables all font theming** (body text won't follow a serif/mono
 * theme — see docs/fonts.md). Strips the `next/font` import, the `const x =
 * Font({…})` blocks, and the `${x.variable}` class references — all-or-nothing, so
 * it never leaves a dangling reference; bails (→ keeps the documented note) on an
 * unfamiliar shape. Idempotent: re-runs are no-ops once `next/font` is gone.
 */
export function stripNextFont(src: string): PatchResult {
  if (!/from\s*["']next\/font\//.test(src)) return { content: src, changed: false };
  const imp = src.match(/^import\s*\{([^}]*)\}\s*from\s*["']next\/font\/[^"']+["'];?[ \t]*\n/m);
  if (!imp) return { content: src, changed: false, reason: 'unrecognized next/font import shape' };
  const fns = imp[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const blocks: { re: RegExp; varName: string }[] = [];
  for (const fn of fns) {
    const m = src.match(new RegExp(`const\\s+(\\w+)\\s*=\\s*${fn}\\(\\{[\\s\\S]*?\\}\\);`));
    if (!m) return { content: src, changed: false, reason: `no const block for next/font font ${fn}` };
    blocks.push({ re: new RegExp(`const\\s+\\w+\\s*=\\s*${fn}\\(\\{[\\s\\S]*?\\}\\);\\n*`), varName: m[1] });
  }
  let out = src.replace(imp[0], '');
  for (const b of blocks) out = out.replace(b.re, '');
  for (const b of blocks) out = out.replace(new RegExp(`\\$\\{${b.varName}\\.variable\\}\\s*`, 'g'), '');
  return { content: out, changed: out !== src };
}

/**
 * Remove create-next-app's font overrides from `app/globals.css`: the
 * `--font-sans`/`--font-mono` remap to the Geist vars (which redefines Veneer's
 * token) and the hard `body { font-family: … }` rule (which wins over the token on
 * body text). Leaves the rest of the stylesheet untouched. Idempotent.
 */
export function stripNextFontCss(css: string): PatchResult {
  let out = css;
  out = out.replace(/^[ \t]*--font-sans:\s*var\(--font-geist-sans\);[ \t]*\n/m, '');
  out = out.replace(/^[ \t]*--font-mono:\s*var\(--font-geist-mono\);[ \t]*\n/m, '');
  out = out.replace(/^[ \t]*font-family:\s*Arial[^;]*;[ \t]*\n/m, '');
  return { content: out, changed: out !== css };
}

/**
 * Remove create-next-app's own color system from `app/globals.css` so Veneer's
 * tokens fully own the surface. The template ships, after the Tailwind import,
 * a `:root { --background; --foreground }` pair, an `@theme inline` block that mints
 * non-Veneer `bg-background` / `text-foreground` utilities, a
 * `@media (prefers-color-scheme: dark)` flip, and a `body { background; color }`
 * rule. Together they pin the page surface to a fixed light/dark value independent
 * of the chosen theme — so any element not wrapped in `bg-surface` (and the body
 * itself, on overscroll) shows through un-themed. Each removal is anchored and
 * idempotent; this runs on a fresh scaffold only, where the shapes are
 * create-next-app's own (never a user's).
 */
export function stripNextColorSystem(css: string): PatchResult {
  let out = css;
  // Top-level `:root { … --background … --foreground … }` (the indented `:root`
  // inside the @media block below is removed along with it).
  out = out.replace(/^:root\s*\{[^}]*--background[^}]*\}\n*/m, '');
  // `@theme inline { … }` — the source of the fake-themeable `bg-background` utilities.
  out = out.replace(/^@theme\s+inline\s*\{[^}]*\}\n*/m, '');
  // `@media (prefers-color-scheme: dark) { :root { … } }` — an OS dark-mode flip that
  // would override the chosen theme's surface.
  out = out.replace(/^@media\s*\(prefers-color-scheme:\s*dark\)\s*\{[\s\S]*?\}\s*\}\n*/m, '');
  // `body { background: …; color: … }` — pins the body surface independent of theme.
  out = out.replace(/^body\s*\{[^}]*\}\n*/m, '');
  return { content: out, changed: out !== css };
}

/**
 * Replace create-next-app's default `title: "Create Next App"` metadata with the
 * app's own name. Only touches the known default, so a user-set title is preserved.
 */
export function setNextTitle(src: string, title: string): PatchResult {
  const re = /title:\s*["']Create Next App["']/;
  if (!re.test(src)) return { content: src, changed: false };
  return { content: src.replace(re, `title: ${JSON.stringify(title)}`), changed: true };
}

/**
 * Undo the create-react-router template's theme-fighting CSS defaults in
 * `app/app.css`: a `@theme { --font-sans: "Inter" … }` block that **pins the font
 * token** (so body text won't follow a serif/mono theme — see docs/fonts.md), and
 * an `html, body { @apply bg-white dark:bg-gray-950; … }` rule that pins the page
 * surface to a fixed light/dark value independent of the chosen theme. The font
 * `@theme` is removed; the surface is re-pointed at `bg-surface text-text`; the
 * nested OS dark-mode `@media` is dropped. Anchored on the template's own shapes,
 * idempotent, and all-or-nothing per edit — bails quietly on an unfamiliar file.
 */
export function stripReactRouterTemplateCss(css: string): PatchResult {
  let out = css;
  // The template's own `@theme { --font-sans: … }` (Veneer's tokens arrive via the
  // imported tokens.css, never an inline @theme here, so this block is the template's).
  out = out.replace(/^@theme\s*\{[^}]*--font-sans[^}]*\}\n*/m, '');
  // Drive the page surface from tokens instead of the pinned palette pair.
  out = out.replace(/bg-white\s+dark:bg-gray-950/, 'bg-surface text-text');
  // The nested OS dark-mode flip would override a chosen light theme's color-scheme.
  // Consume the leading blank line + indent but leave the enclosing block's newline,
  // so the closing brace keeps its own line.
  out = out.replace(/\n\s*@media\s*\(prefers-color-scheme:\s*dark\)\s*\{[^}]*\}/, '');
  return { content: out, changed: out !== css };
}

/**
 * Remove the create-react-router template's Google-Fonts (Inter) `links` from
 * `app/root.tsx` — the `preconnect` hints + the stylesheet `<link>`. With the font
 * token freed (see `stripReactRouterTemplateCss`), a hard-loaded Inter is dead
 * weight that also implies a fixed family. Only fires when the array actually
 * references Google Fonts, so a user's real `links` are never touched. Idempotent.
 */
export function stripReactRouterFontLinks(src: string): PatchResult {
  const re = /(export const links:\s*Route\.LinksFunction\s*=\s*\(\)\s*=>\s*)\[[\s\S]*?\];/;
  const m = src.match(re);
  if (!m || !/fonts\.(googleapis|gstatic)\.com/.test(m[0])) return { content: src, changed: false };
  return { content: src.replace(re, '$1[];'), changed: true };
}
