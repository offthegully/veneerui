import { describe, expect, it } from 'vitest';
import { buildSetupPlan, EXPERIMENTAL_FRAMEWORKS, SETUP_FILE } from './setup-plan';

const base = {
  globalCssPath: 'src/index.css',
  agentDocs: ['AGENTS.md'],
};

describe('buildSetupPlan', () => {
  it('returns null when nothing manual remains', () => {
    expect(
      buildSetupPlan({
        ...base,
        framework: 'vite',
        viteConfigPath: 'vite.config.ts',
        providerWired: true,
        antiFlashWired: true,
      }),
    ).toBeNull();

    expect(
      buildSetupPlan({
        ...base,
        framework: 'next',
        entryPath: 'app/layout.tsx',
        providerWired: true,
        antiFlashWired: true,
      }),
    ).toBeNull();
  });

  it('Next, nothing wired: lists the provider wrap and the head script, self-deletes', () => {
    const md = buildSetupPlan({
      ...base,
      framework: 'next',
      entryPath: 'app/layout.tsx',
      providerWired: false,
      antiFlashWired: false,
    })!;
    expect(md).toContain('# Finish wiring Veneer');
    expect(md).toContain('1. Wrap your app root in `<ThemeProvider>`');
    expect(md).toContain('In `app/layout.tsx`');
    expect(md).toContain('2. Render the anti-flash script');
    expect(md).toContain('AntiFlashScript');
    // portable, cross-tool hand-off + self-removal
    expect(md).toContain(`Finish the Veneer setup in ${SETUP_FILE}`);
    expect(md).toContain('**Delete this file**');
    // wiring-only scope: switcher/fonts are optional, not numbered steps
    expect(md).toContain('Optional next steps (not required for setup)');
    expect(md).toContain('npx veneerui add switcher');
  });

  it('Vite with the plugin already wired: only the provider step remains, numbered 1', () => {
    const md = buildSetupPlan({
      ...base,
      framework: 'vite',
      entryPath: 'src/main.tsx',
      viteConfigPath: 'vite.config.ts',
      providerWired: false,
      antiFlashWired: true,
    })!;
    expect(md).toContain('1. Wrap your app root in `<ThemeProvider>`');
    expect(md).not.toContain('anti-flash plugin to your Vite config');
    // the wired plugin shows up under "Already done"
    expect(md).toContain('- [x] `veneer()` anti-flash plugin in `vite.config.ts`');
  });

  it('Vite with the plugin NOT wired: includes the manual plugin step', () => {
    const md = buildSetupPlan({
      ...base,
      framework: 'vite',
      entryPath: 'src/main.tsx',
      viteConfigPath: 'vite.config.ts',
      providerWired: false,
      antiFlashWired: false,
    })!;
    expect(md).toContain('1. Wrap your app root in `<ThemeProvider>`');
    expect(md).toContain('2. Add the anti-flash plugin to your Vite config');
    expect(md).toContain("import { veneer } from '@offthegully/veneerui/vite'");
  });

  it('Next with only the head script left: it becomes step 1 (provider dropped)', () => {
    const md = buildSetupPlan({
      ...base,
      framework: 'next',
      entryPath: 'app/layout.tsx',
      providerWired: true,
      antiFlashWired: false,
    })!;
    expect(md).toContain('1. Render the anti-flash script');
    expect(md).not.toContain('Wrap your app root');
  });

  it('other framework, nothing wired: interlock + provider + generic anti-flash, with the untested caveat', () => {
    const md = buildSetupPlan({
      ...base,
      framework: 'other',
      tokenImportWired: false,
      providerWired: false,
      antiFlashWired: false,
    })!;
    // caveat names the experimental frameworks and flags "not fully tested"
    expect(md).toContain('not fully');
    for (const fw of EXPERIMENTAL_FRAMEWORKS) expect(md).toContain(fw);
    // generic three-step path, numbered 1..3
    expect(md).toContain('1. Import the tokens into your Tailwind stylesheet');
    expect(md).toContain('2. Wrap your app root in `<ThemeProvider>`');
    expect(md).toContain('3. Apply the saved theme before first paint');
    expect(md).toContain('getAntiFlashScript');
    // generic provider guidance, not a Vite/Next file path
    expect(md).toContain('Remix `app/root.tsx`');
    expect(md).not.toContain('In `src/main.tsx`');
  });

  it('other framework with the @import already present: interlock drops, provider is step 1', () => {
    const md = buildSetupPlan({
      ...base,
      framework: 'other',
      tokenImportWired: true,
      providerWired: false,
      antiFlashWired: false,
    })!;
    expect(md).not.toContain('Import the tokens into your Tailwind stylesheet');
    expect(md).toContain('1. Wrap your app root in `<ThemeProvider>`');
    expect(md).toContain('2. Apply the saved theme before first paint');
  });

  it('names the agent docs so the file tells you to leave them in place', () => {
    const md = buildSetupPlan({
      ...base,
      agentDocs: ['AGENTS.md', 'CLAUDE.md'],
      framework: 'vite',
      entryPath: 'src/main.tsx',
      viteConfigPath: 'vite.config.ts',
      providerWired: false,
      antiFlashWired: true,
    })!;
    expect(md).toContain('`AGENTS.md` / `CLAUDE.md`');
  });
});
