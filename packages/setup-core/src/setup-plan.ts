/**
 * `VENEER-SETUP.md` — the one-time, project-specific "finish wiring" checklist.
 *
 * `init` makes the edits it can apply blindly and writes the rest here. The steps
 * it deliberately won't patch — wrapping the app root in `<ThemeProvider>`, the
 * Next `<head>` script, the generic anti-flash for other frameworks — are exactly
 * the project-shaped ones an AI agent (or the developer) can finish from context.
 * This builds a portable markdown task-file that is BOTH the manual doc and the
 * agent's instructions: it lands in the repo, and the user either does the steps
 * or tells any coding agent (Cursor, Copilot, Claude, …) "finish the Veneer setup
 * in VENEER-SETUP.md." It's transient — the last step is to delete it — so the
 * persistent token rules in AGENTS.md remain the only lasting guide.
 *
 * Scope is wiring + verify only: the switcher, fonts, and theme authoring are
 * listed as optional next steps, not setup. Pure (input → string|null) so it's
 * unit-testable and `--dry-run`-safe; `runInit` decides whether to write it.
 */
import { providerSnippet, nextAntiFlashSnippet, TOKENS_IMPORT } from './patch';
import { getProfile, type FrameworkId } from './profiles';
import { execHint, installHint, runHint, type PackageManager } from './pm';

export const SETUP_FILE = 'VENEER-SETUP.md';

/**
 * Docs pointers printed into consumer projects must be full URLs — a bare
 * `docs/integration.md` is a path in *this* repo, which doesn't exist in theirs.
 */
export const INTEGRATION_GUIDE_URL =
  'https://github.com/offthegully/veneerui/blob/main/docs/integration.md';
export const FONTS_GUIDE_URL = 'https://github.com/offthegully/veneerui/blob/main/docs/fonts.md';
export const EXPO_GUIDE_URL = 'https://github.com/offthegully/veneerui/blob/main/docs/expo.md';

/**
 * React frameworks Veneer's runtime works on, but which the CLI doesn't yet
 * auto-detect/wire (so they go through the generic manual path). React Router 7
 * and TanStack Start are NOT here — they're recognized and auto-wired now (see
 * `profiles.ts`). Astro stays because its document is `.astro`, not a React root,
 * so it needs the per-island pattern, not the `<ThemeProvider>`-wraps-the-tree
 * wiring. Surfaced in init's output + the generic setup file. Keep in sync with
 * the "Other React frameworks" section of docs/integration.md.
 */
export const EXPERIMENTAL_FRAMEWORKS = [
  'Astro (React islands)',
  'Gatsby',
  'RedwoodJS',
] as const;

export type SetupFramework = FrameworkId | 'other';

export interface SetupPlanInput {
  framework: SetupFramework;
  /** The project's package manager, so the install/run commands match it. Defaults to npm. */
  pm?: PackageManager;
  /** The entry file the provider wrap lands in (named so a human/agent can find it). */
  entryPath?: string;
  globalCssPath?: string;
  viteConfigPath?: string;
  /** Agent doc(s) init wrote — named so the file can say "leave those in place". */
  agentDocs: string[];
  /** The token `@import` is in the global stylesheet. Defaults true (init adds it). */
  tokenImportWired?: boolean;
  /** True once the root is wrapped in `<ThemeProvider>` — then that step is dropped. */
  providerWired: boolean;
  /** Vite: the `veneer()` plugin is present. Next: `<AntiFlashScript/>`. Other: the inline script. */
  antiFlashWired: boolean;
  /** True once Veneer's `veneer/*` ESLint rules are wired. When `false`, the lint step is added. */
  eslintWired?: boolean;
  /**
   * create-next-app template pins detected on an *existing* app (init warns, it
   * never rewrites an existing project's files) — each true adds a removal step.
   */
  nextFontPinned?: boolean;
  nextTemplateCssPinned?: boolean;
}

/** Render an agent-doc list as `` `AGENTS.md` `` / `` `CLAUDE.md` ``, or a default. */
function docList(docs: string[], sep: string): string {
  if (!docs.length) return '`AGENTS.md`';
  return docs.map((d) => `\`${d}\``).join(sep);
}

/** The `### N. …` provider step, per framework. */
function providerStep(input: SetupPlanInput, n: number): string[] {
  if (input.framework === 'other') {
    return [
      `### ${n}. Wrap your app root in \`<ThemeProvider>\``,
      '',
      'Wrap the top of your component tree — wherever your framework renders the root',
      '(e.g. Remix `app/root.tsx`, Astro a React-island wrapper, Gatsby `wrapRootElement`,',
      'TanStack Start the root route). Make it a client component if your framework',
      'splits server/client.',
      '',
      '```tsx',
      "import { ThemeProvider } from '@offthegully/veneerui'",
      '',
      '// <ThemeProvider>{/* your app */}</ThemeProvider>',
      '```',
      '',
    ];
  }
  // SSR root document (React Router 7, TanStack Start, …): wrap the document's
  // `{children}` directly — no `'use client'` providers file (no RSC boundary).
  if (getProfile(input.framework)?.wiring === 'ssr-root') {
    const entry = input.entryPath ?? 'your root document (e.g. app/root.tsx, src/routes/__root.tsx)';
    return [
      `### ${n}. Wrap your app root in \`<ThemeProvider>\``,
      '',
      `In \`${entry}\`, wrap the root document's \`{children}\` (no \`'use client'\` needed —`,
      'these frameworks have no RSC boundary):',
      '',
      '```tsx',
      "import { ThemeProvider } from '@offthegully/veneerui'",
      '// <body><ThemeProvider>{children}</ThemeProvider> … </body>',
      '```',
      '',
    ];
  }
  // Vite / Next: the only remaining cases reach providerSnippet (typed to those two).
  const entry =
    input.entryPath ?? (input.framework === 'next' ? 'app/layout.tsx' : 'src/main.tsx');
  return [
    `### ${n}. Wrap your app root in \`<ThemeProvider>\``,
    '',
    `In \`${entry}\`, wrap your root component:`,
    '',
    '```tsx',
    providerSnippet(input.framework as 'vite' | 'next', false),
    '```',
    '',
  ];
}

/** The `### N. …` anti-flash step, per framework. */
function antiFlashStep(input: SetupPlanInput, n: number): string[] {
  if (input.framework === 'vite') {
    return [
      `### ${n}. Add the anti-flash plugin to your Vite config`,
      '',
      `\`init\` could not safely edit \`${input.viteConfigPath ?? 'vite.config.ts'}\` — add it by hand:`,
      '',
      '```ts',
      "import { veneer } from '@offthegully/veneerui/vite'",
      '// then: plugins: [react(), tailwindcss(), veneer()]',
      '```',
      '',
    ];
  }
  if (input.framework === 'next') {
    return [
      `### ${n}. Render the anti-flash script in \`<head>\``,
      '',
      '```tsx',
      nextAntiFlashSnippet(),
      '```',
      '',
    ];
  }
  // other: the generic inline-script escape hatch.
  return [
    `### ${n}. Apply the saved theme before first paint`,
    '',
    'Inline the anti-flash script in your document `<head>`, before any stylesheet, so',
    'a returning visitor sees their saved theme with no flash:',
    '',
    '```tsx',
    "import { getAntiFlashScript } from '@offthegully/veneerui'",
    '',
    '// render in your document <head> (e.g. Remix root.tsx, Astro layout):',
    '<script dangerouslySetInnerHTML={{ __html: getAntiFlashScript() }} />',
    '```',
    '',
  ];
}

/** The `### N. …` lint-gate step (shown when the veneer/* rules aren't wired). */
function eslintStep(pm: PackageManager, n: number): string[] {
  return [
    `### ${n}. Enable the veneer/* themeability lint rules`,
    '',
    'So a stray `bg-blue-500`, `shadow-md`, `p-[18px]`, or `bg-opacity-50` fails lint',
    'instead of silently shipping an un-themeable island, install the plugin and add',
    'its preset to your ESLint flat config:',
    '',
    '```sh',
    installHint(pm, ['eslint-plugin-veneer'], true),
    '```',
    '',
    '```js',
    "import veneer from 'eslint-plugin-veneer'",
    '// add to your flat-config array:',
    '//   veneer.configs.recommended,',
    '```',
    '',
  ];
}

/**
 * The create-next-app template pins that silently defeat theming — detected by
 * `init` on an existing Next app and left as removal steps here (the scaffolder
 * strips them itself on a fresh app; `init` never rewrites an existing project's
 * opinionated files).
 */
function nextFontPinStep(n: number): string[] {
  return [
    `### ${n}. Remove the template's \`next/font\` pin (it disables font theming)`,
    '',
    'Your layout still loads the create-next-app fonts (Geist) via `next/font` and pins',
    "them on `<body>`. A hard-coded family overrides Veneer's `font-sans` token, so no",
    'theme can change body text. In your `app/layout.tsx`, remove the `next/font` import,',
    'the `Geist…({ … })` const blocks, and the `${….variable}` classes they add to `<body>`.',
    '',
    `More on why: ${FONTS_GUIDE_URL}`,
    '',
  ];
}

function nextTemplateCssStep(n: number): string[] {
  return [
    `### ${n}. Remove the template's own color system from \`app/globals.css\``,
    '',
    'The create-next-app stylesheet ships a `:root { --background; --foreground }` pair,',
    'an `@theme inline` block, a `@media (prefers-color-scheme: dark)` flip, and a',
    '`body { background; color }` rule. Together they pin the page surface to a fixed',
    'light/dark value that never follows the chosen theme. Delete those blocks and drive',
    'the surface from tokens instead (e.g. `<body className="bg-surface text-text">`).',
    '',
  ];
}

/**
 * Build the setup checklist, or return `null` when nothing manual remains (so
 * `init` can skip writing the file and report a clean setup instead).
 */
export function buildSetupPlan(input: SetupPlanInput): string | null {
  const pm = input.pm ?? 'npm';
  const tokenImportWired = input.tokenImportWired ?? true;
  const needsInterlock = !tokenImportWired;
  const needsProvider = !input.providerWired;
  const needsAntiFlash = !input.antiFlashWired;
  // Only when explicitly false — an undefined (older caller) means "don't ask".
  const needsEslint = input.eslintWired === false;
  const needsFontUnpin = input.nextFontPinned === true;
  const needsCssUnpin = input.nextTemplateCssPinned === true;
  if (!needsInterlock && !needsProvider && !needsAntiFlash && !needsEslint && !needsFontUnpin && !needsCssUnpin) {
    return null;
  }

  // Remaining steps, numbered dynamically so a single-step run reads "1.".
  const steps: string[] = [];
  let n = 1;
  if (needsInterlock) {
    steps.push(
      `### ${n++}. Import the tokens into your Tailwind stylesheet`,
      '',
      'In the CSS file where you import Tailwind, add the tokens right after it:',
      '',
      '```css',
      '@import "tailwindcss";',
      TOKENS_IMPORT,
      '```',
      '',
    );
  }
  if (needsProvider) steps.push(...providerStep(input, n++));
  if (needsAntiFlash) steps.push(...antiFlashStep(input, n++));
  if (needsEslint) steps.push(...eslintStep(pm, n++));
  if (needsFontUnpin) steps.push(...nextFontPinStep(n++));
  if (needsCssUnpin) steps.push(...nextTemplateCssStep(n++));

  // What init already handled — so the agent/dev has the full picture and does
  // not redo it. (On an unrecognized framework, often just the agent guide.)
  const done: string[] = [];
  if (tokenImportWired) {
    done.push(
      `- [x] \`@import "@offthegully/veneerui/tokens.css"\`${
        input.globalCssPath ? ` in \`${input.globalCssPath}\`` : ''
      }`,
    );
  }
  if (input.framework === 'vite' && input.antiFlashWired) {
    done.push(
      `- [x] \`veneer()\` anti-flash plugin in \`${input.viteConfigPath ?? 'vite.config.ts'}\``,
    );
  }
  if (input.agentDocs.length) {
    done.push(`- [x] Veneer agent guide written to ${docList(input.agentDocs, ', ')}`);
  }

  const caveat =
    input.framework === 'other'
      ? [
          '> **Heads up:** your framework was not auto-detected, so `init` did not patch',
          '> any files. Veneer’s runtime is framework-agnostic (React 19 + Tailwind v4), so',
          '> these popular setups should work via the steps below — they just are not fully',
          `> tested yet: ${EXPERIMENTAL_FRAMEWORKS.join(', ')}.`,
          '',
        ]
      : [];

  return [
    '# Finish wiring Veneer',
    '',
    ...caveat,
    '`veneerui init` made the edits it can apply safely. The steps below are left',
    'because they touch your entry files — too project-specific to patch blindly,',
    'but quick to finish. **Do them yourself, or tell your AI coding agent:**',
    '',
    '> "Finish the Veneer setup in VENEER-SETUP.md, then verify it and delete this file."',
    '',
    'This file is one-time setup. The ongoing rules for building themeable UI live in',
    `${docList(input.agentDocs, ' / ')} (also added by init) — leave those in place.`,
    '',
    ...(done.length ? ['## Already done by `init` ✓', '', ...done, ''] : []),
    '## Remaining steps',
    '',
    ...steps,
    '## Verify',
    '',
    'Automated checks — these exit on their own, so they are safe for an agent to run:',
    '',
    `- production build — \`${runHint(pm, 'build')}\` (typechecks too on TS templates)`,
    `- typecheck on its own — \`${execHint(pm, 'tsc --noEmit')}\` (if the project has no \`typecheck\` script)`,
    '',
    `Manual check — skip this if an AI agent is finishing setup, since \`${runHint(pm, 'dev')}\``,
    'never exits and would hang an automated run:',
    '',
    `- \`${runHint(pm, 'dev')}\`, then confirm the app renders with no console errors on the default theme`,
    '',
    '## When it works',
    '',
    '**Delete this file** — setup is done. From here, build UI from the token utilities',
    '(`bg-surface`, `text-text`, `rounded-md`, …) and your agent will follow the rules',
    `in ${docList(input.agentDocs, ' / ')}.`,
    '',
    'Optional next steps (not required for setup):',
    '',
    `- \`${execHint(pm, 'veneerui add switcher')}\` — drop in a theme switcher UI (a fresh \`create-veneerui\` scaffold already has one)`,
    `- \`${execHint(pm, 'veneerui add fonts')}\` — load the fonts the built-in themes name`,
    `- ship your own themes with \`defineTheme\` — see ${INTEGRATION_GUIDE_URL}`,
    '',
  ].join('\n');
}
