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

export const SETUP_FILE = 'VENEER-SETUP.md';

/**
 * Popular React frameworks Veneer's runtime should work with, but which the CLI
 * doesn't auto-wire and we haven't fully tested. Surfaced in init's output and in
 * the generic setup file so users know they're supported via the manual path.
 * Keep in sync with the "Other React frameworks" section of docs/integration.md.
 */
export const EXPERIMENTAL_FRAMEWORKS = [
  'Remix / React Router',
  'TanStack Start',
  'Astro (React islands)',
  'Gatsby',
  'RedwoodJS',
] as const;

export type SetupFramework = 'vite' | 'next' | 'other';

export interface SetupPlanInput {
  framework: SetupFramework;
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
  const entry =
    input.entryPath ?? (input.framework === 'next' ? 'app/layout.tsx' : 'src/main.tsx');
  return [
    `### ${n}. Wrap your app root in \`<ThemeProvider>\``,
    '',
    `In \`${entry}\`, wrap your root component:`,
    '',
    '```tsx',
    providerSnippet(input.framework, false),
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

/**
 * Build the setup checklist, or return `null` when nothing manual remains (so
 * `init` can skip writing the file and report a clean setup instead).
 */
export function buildSetupPlan(input: SetupPlanInput): string | null {
  const tokenImportWired = input.tokenImportWired ?? true;
  const needsInterlock = !tokenImportWired;
  const needsProvider = !input.providerWired;
  const needsAntiFlash = !input.antiFlashWired;
  if (!needsInterlock && !needsProvider && !needsAntiFlash) return null;

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
    'Each of these should pass:',
    '',
    '- `npx veneerui doctor` — confirms the tokens are imported (and reports how much',
    '  of your UI is themeable today)',
    '- your typecheck / build (e.g. `npm run typecheck`, `npm run build`)',
    '- `npm run dev` — the app renders with no console errors, on the default theme',
    '',
    '## When it works',
    '',
    '**Delete this file** — setup is done. From here, build UI from the token utilities',
    '(`bg-surface`, `text-text`, `rounded-md`, …) and your agent will follow the rules',
    `in ${docList(input.agentDocs, ' / ')}.`,
    '',
    'Optional next steps (not required for setup):',
    '',
    '- `npx veneerui add switcher` — drop in a theme switcher UI',
    '- `npx veneerui add fonts` — load the fonts the built-in themes name',
    '- ship your own themes with `defineTheme` — see the integration guide',
    '',
  ].join('\n');
}
