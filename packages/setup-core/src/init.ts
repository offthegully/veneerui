/**
 * `veneerui init` — wire Veneer into a Vite or Next + Tailwind v4 app.
 *
 * This is the single wiring engine: both `veneerui init` (existing app) and the
 * `create-veneerui` scaffolder (new app) call it. It makes the deterministic edits
 * — the token `@import`, the anti-flash plugin/script, and wrapping the root in
 * `<ThemeProvider>` — by patching the entry files when their shape is recognized
 * (always true on a freshly scaffolded app, often true on an existing one). When a
 * file's shape is unfamiliar it bails and writes that step to a self-removing
 * `VENEER-SETUP.md`, so the developer (or any AI agent) can finish it.
 *
 * For any *other* React + Tailwind v4 project (Remix, Astro, TanStack Start, …) the
 * CLI can't auto-wire the framework, but the runtime still works — so init drops the
 * agent guide and a *generic* VENEER-SETUP.md (the manual three-step path) instead of
 * bailing. Idempotent and `--dry-run`-able: re-running is a no-op, and nothing here
 * installs packages or rewrites your component tree.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { detect, type Detection } from './detect';
import {
  addEslintRule,
  addTokensImport,
  addViteAntiFlash,
  eslintConfigSnippet,
  nextAntiFlashSnippet,
  providerSnippet,
} from './patch';
import { createNextProviders, wireNextLayout, wrapEntryWithProvider } from './entry-patch';
import { agentDocTargets, readAgentGuide, upsertAgentGuide } from './agents';
import { buildSetupPlan, EXPERIMENTAL_FRAMEWORKS, SETUP_FILE } from './setup-plan';

export interface InitOptions {
  root: string;
  dryRun?: boolean;
  log?: (line: string) => void;
}

export function runInit(opts: InitOptions): void {
  const log = opts.log ?? console.log;
  const det = detect(opts.root);
  const dry = opts.dryRun ? ' (dry-run)' : '';

  log(`Veneer init${dry}`);
  log(`  framework: ${det.framework}`);
  log(`  @offthegully/veneerui installed: ${det.hasVeneerTheme ? 'yes' : 'no'}`);
  log(`  tailwindcss present: ${det.hasTailwind ? 'yes' : 'no'}\n`);

  if (det.framework === 'unknown') {
    runOtherFramework(opts, det, log);
    return;
  }

  // 1 — dependencies (we never auto-install; we instruct).
  log('1. Dependencies');
  if (!det.hasVeneerTheme) log('   → run: npm i @offthegully/veneerui');
  else log('   ✓ @offthegully/veneerui already a dependency');
  if (!det.hasTailwind) log('   ! Tailwind v4 not found — Veneer requires it (npm i tailwindcss @tailwindcss/vite).');
  if (!det.hasEslintPlugin) log('   → run: npm i -D eslint-plugin-veneer  (the no-hardcoded-colors lint gate)');
  else log('   ✓ eslint-plugin-veneer already a dependency');

  // 2 — token @import in the global stylesheet.
  log('2. Token CSS');
  if (det.globalCssPath) {
    const abs = join(opts.root, det.globalCssPath);
    const before = readFileSync(abs, 'utf8');
    const { content, changed } = addTokensImport(before);
    if (!changed) log(`   ✓ ${det.globalCssPath} already imports @offthegully/veneerui/tokens.css`);
    else if (opts.dryRun) log(`   → would add the @import to ${det.globalCssPath}`);
    else {
      writeFileSync(abs, content);
      log(`   ✓ added @import "@offthegully/veneerui/tokens.css" to ${det.globalCssPath}`);
    }
  } else {
    log('   ! No Tailwind stylesheet found. Add this to your global CSS, after the');
    log('     tailwindcss import:  @import "@offthegully/veneerui/tokens.css";');
  }

  // 3 — provider + anti-flash. These patch the entry files when their shape is
  // recognized; when it isn't, they bail and print the snippet, and step 5
  // records it in VENEER-SETUP.md for you (or your agent) to finish.
  log('3. Provider + anti-flash');
  if (det.framework === 'vite') wireViteEntry(opts, det, log);
  else wireNextEntry(opts, det, log);

  // 4 — the lint gate: enable veneer/no-hardcoded-colors so a stray bg-blue-500
  // fails lint/CI instead of silently shipping an un-themeable island.
  log('\n4. Lint gate (no hardcoded colors)');
  wireEslint(opts, det, log);

  // 5 — agent guide so AI coding tools write themeable components.
  log('\n5. Agent guide (so AI tools write themeable components)');
  const agentDocs = writeAgentGuide(opts, log);

  // 6 — the finish-setup hand-off: whatever the patchers couldn't apply is written
  // to a portable, self-removing VENEER-SETUP.md. Skipped once everything is wired
  // (the common case on a fresh app), so a re-run stays clean.
  log('\n6. Finish setup');
  const plan = buildSetupPlan({
    framework: det.framework as 'vite' | 'next',
    entryPath: det.entryPath,
    globalCssPath: det.globalCssPath,
    viteConfigPath: det.viteConfigPath,
    agentDocs,
    tokenImportWired: !!det.globalCssPath,
    providerWired: isProviderWired(opts.root, det),
    antiFlashWired: isAntiFlashWired(opts.root, det),
    eslintWired: isEslintWired(opts.root, det),
  });
  writeSetupFile(opts, plan, log);

  printOutro(log);
}

/** Vite: the veneer() anti-flash plugin in the config, and the `<ThemeProvider>` wrap in the entry. */
function wireViteEntry(opts: InitOptions, det: Detection, log: (line: string) => void): void {
  if (det.viteConfigPath) {
    const abs = join(opts.root, det.viteConfigPath);
    const before = readFileSync(abs, 'utf8');
    if (before.includes('@offthegully/veneerui/vite')) {
      log(`   ✓ ${det.viteConfigPath} already uses the veneer() plugin`);
    } else {
      const { content, changed, reason } = addViteAntiFlash(before);
      if (!changed) {
        log(`   ! couldn't edit ${det.viteConfigPath} (${reason}) — add it manually:`);
        log("       import { veneer } from '@offthegully/veneerui/vite'  // plugins: [react(), veneer()]");
      } else if (opts.dryRun) {
        log(`   → would add the veneer() plugin to ${det.viteConfigPath}`);
      } else {
        writeFileSync(abs, content);
        log(`   ✓ added the veneer() plugin to ${det.viteConfigPath}`);
      }
    }
  } else {
    log('   ! no vite config found — add the veneer() plugin from @offthegully/veneerui/vite manually.');
  }

  if (det.entryPath) {
    const abs = join(opts.root, det.entryPath);
    const before = readFileSync(abs, 'utf8');
    if (before.includes('ThemeProvider')) {
      log(`   ✓ ${det.entryPath} already wraps the root in <ThemeProvider>`);
    } else {
      const { content, changed, reason } = wrapEntryWithProvider(before);
      if (!changed) {
        log(`   ! couldn't wrap ${det.entryPath} (${reason}) — wrap your root manually:`);
        indent(log, providerSnippet('vite', false));
      } else if (opts.dryRun) {
        log(`   → would wrap the root in ${det.entryPath} with <ThemeProvider>`);
      } else {
        writeFileSync(abs, content);
        log(`   ✓ wrapped the root in ${det.entryPath} with <ThemeProvider>`);
      }
    }
  } else {
    log('   ! no entry file found — wrap your root in <ThemeProvider> manually:');
    indent(log, providerSnippet('vite', false));
  }
}

/** Next: a client providers.tsx, plus providers + anti-flash + suppressHydrationWarning in the layout. */
function wireNextEntry(opts: InitOptions, det: Detection, log: (line: string) => void): void {
  const layoutRel = det.entryPath ?? 'app/layout.tsx';
  const layoutAbs = join(opts.root, layoutRel);

  const providersAbs = join(dirname(layoutAbs), 'providers.tsx');
  if (existsSync(providersAbs)) {
    log('   ✓ providers.tsx already present');
  } else if (opts.dryRun) {
    log('   → would create the client providers.tsx beside the layout');
  } else {
    writeFileSync(providersAbs, createNextProviders());
    log(`   ✓ created ${join(dirname(layoutRel), 'providers.tsx')}`);
  }

  if (!existsSync(layoutAbs)) {
    log(`   ! no ${layoutRel} found — add the provider + anti-flash manually:`);
    indent(log, nextAntiFlashSnippet());
    return;
  }
  const before = readFileSync(layoutAbs, 'utf8');
  if (before.includes('<Providers>') && before.includes('AntiFlashScript')) {
    log(`   ✓ ${layoutRel} already wired (providers + anti-flash)`);
    return;
  }
  const { content, changed, reason } = wireNextLayout(before);
  if (!changed) {
    log(`   ! couldn't wire ${layoutRel} (${reason}) — add it manually:`);
    indent(log, nextAntiFlashSnippet());
  } else if (opts.dryRun) {
    log(`   → would wire ${layoutRel} (providers + anti-flash + suppressHydrationWarning)`);
  } else {
    writeFileSync(layoutAbs, content);
    log(`   ✓ wired ${layoutRel} (providers + anti-flash + suppressHydrationWarning)`);
  }
}

/**
 * Enable the `veneer/no-hardcoded-colors` rule in the project's ESLint flat
 * config — the executable half of the token contract (the agent guide is the
 * prose half). Patches the config the scaffolders emit; on an unfamiliar shape it
 * prints the snippet and step 6 records it in VENEER-SETUP.md.
 */
function wireEslint(opts: InitOptions, det: Detection, log: (line: string) => void): void {
  if (!det.eslintConfigPath) {
    log('   ! no ESLint flat config found — add the veneer preset manually:');
    indent(log, eslintConfigSnippet());
    return;
  }
  const abs = join(opts.root, det.eslintConfigPath);
  const before = readFileSync(abs, 'utf8');
  if (before.includes('eslint-plugin-veneer')) {
    log(`   ✓ ${det.eslintConfigPath} already enables veneer/no-hardcoded-colors`);
    return;
  }
  const { content, changed, reason } = addEslintRule(before);
  if (!changed) {
    log(`   ! couldn't edit ${det.eslintConfigPath} (${reason}) — add it manually:`);
    indent(log, eslintConfigSnippet());
  } else if (opts.dryRun) {
    log(`   → would add veneer.configs.recommended to ${det.eslintConfigPath}`);
  } else {
    writeFileSync(abs, content);
    log(`   ✓ added veneer.configs.recommended to ${det.eslintConfigPath}`);
  }
}

/**
 * Anything that isn't Vite or Next. The CLI can't auto-wire the framework, but
 * Veneer's runtime is just React 19 + Tailwind v4, so a plausible React + Tailwind
 * project still gets the agent guide and a *generic* VENEER-SETUP.md (the manual
 * path) — making the "tell your agent to finish it" flow work everywhere.
 */
function runOtherFramework(opts: InitOptions, det: Detection, log: (line: string) => void): void {
  log('Could not auto-detect Vite or Next — those are the two `init` wires for you.');
  log("Veneer's runtime is framework-agnostic (React 19 + Tailwind v4); these popular");
  log('setups should work via the manual steps, though they are not fully tested yet:');
  log(`  ${EXPERIMENTAL_FRAMEWORKS.join(', ')}.`);

  const plausible =
    existsSync(join(opts.root, 'package.json')) &&
    (det.hasReact || det.hasTailwind || det.hasVeneerTheme);
  if (!plausible) {
    log("\nThis doesn't look like a React + Tailwind project yet. Once `react` and");
    log('`tailwindcss` are installed, re-run `npx veneerui init`, or follow the');
    log('"Other React frameworks" section of docs/integration.md by hand.');
    return;
  }

  log('\n1. Dependencies');
  if (!det.hasVeneerTheme) log('   → run: npm i @offthegully/veneerui');
  else log('   ✓ @offthegully/veneerui already a dependency');
  if (!det.hasTailwind) log('   ! Tailwind v4 not found — Veneer requires it (npm i tailwindcss).');

  log('\n2. Agent guide (so AI tools write themeable components)');
  const agentDocs = writeAgentGuide(opts, log);

  // Don't auto-edit an unrecognized project's files; just detect whether the
  // token @import already happens to be there, and let the setup file instruct
  // the rest.
  const css = readRel(opts.root, det.globalCssPath);
  const tokenImportWired = !!css && css.includes('@offthegully/veneerui/tokens.css');

  log('\n3. Finish setup');
  const plan = buildSetupPlan({
    framework: 'other',
    globalCssPath: tokenImportWired ? det.globalCssPath : undefined,
    agentDocs,
    tokenImportWired,
    providerWired: false,
    antiFlashWired: false,
    eslintWired: false,
  });
  writeSetupFile(opts, plan, log);

  printOutro(log);
}

/** Write/refresh the agent guide into the project's AGENTS.md / CLAUDE.md; returns the targets. */
function writeAgentGuide(opts: InitOptions, log: (line: string) => void): string[] {
  const guide = readAgentGuide();
  const agentDocs = agentDocTargets(opts.root);
  for (const rel of agentDocs) {
    const abs = join(opts.root, rel);
    const existing = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
    const { content, changed } = upsertAgentGuide(existing, guide);
    const verb = existing == null ? 'create' : 'update';
    if (!changed) log(`   ✓ ${rel} already has the current Veneer guide`);
    else if (opts.dryRun) log(`   → would ${verb} ${rel} with the Veneer agent guide`);
    else {
      writeFileSync(abs, content);
      log(`   ✓ ${verb}d ${rel} with the Veneer agent guide`);
    }
  }
  return agentDocs;
}

/** Write VENEER-SETUP.md (or report a clean setup / dry-run) + the agent-handoff pointer. */
function writeSetupFile(opts: InitOptions, plan: string | null, log: (line: string) => void): void {
  if (!plan) {
    log('   ✓ No manual steps remain — Veneer is fully wired.');
    return;
  }
  if (opts.dryRun) {
    log(`   → would write ${SETUP_FILE} with the remaining steps`);
    return;
  }
  writeFileSync(join(opts.root, SETUP_FILE), plan);
  log(`   ✓ wrote ${SETUP_FILE} — the remaining wiring, as a checklist.`);
  log('     Finish it yourself, or tell your AI coding agent:');
  log(`       "Finish the Veneer setup in ${SETUP_FILE}, then verify it and delete the file."`);
}

/** The shared closing note: Veneer only re-skins token-driven styles; point at AGENTS.md. */
function printOutro(log: (line: string) => void): void {
  log('\nVeneer only themes elements that use token utilities (bg-surface, text-text, …).');
  log('On an existing app, existing styles re-skin once they move onto tokens. The token');
  log('rules — what a theme can change, and the gotchas that silently break it — are in');
  log('the AGENTS.md guide written above; skim it before building UI.');
}

function indent(log: (s: string) => void, block: string): void {
  for (const line of block.split('\n')) log(`     ${line}`);
}

/** Read a project file relative to root, or null if absent/unset. */
function readRel(root: string, rel?: string): string | null {
  if (!rel) return null;
  const abs = join(root, rel);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
}

/**
 * Best-effort: is the app root already wrapped in `<ThemeProvider>`? The wrap may
 * live in the entry file or (Next) in a sibling providers file, so check both.
 */
function isProviderWired(root: string, det: Detection): boolean {
  const candidates =
    det.framework === 'next'
      ? [det.entryPath, 'app/providers.tsx', 'src/app/providers.tsx']
      : [det.entryPath];
  return candidates.some((c) => (readRel(root, c) ?? '').includes('ThemeProvider'));
}

/** Is anti-flash wired? Vite: the plugin import in the config. Next: the head script. */
function isAntiFlashWired(root: string, det: Detection): boolean {
  if (det.framework === 'vite') {
    return (readRel(root, det.viteConfigPath) ?? '').includes('@offthegully/veneerui/vite');
  }
  const candidates = [det.entryPath, 'app/layout.tsx', 'src/app/layout.tsx'];
  return candidates.some((c) => (readRel(root, c) ?? '').includes('AntiFlashScript'));
}

/** Is the veneer ESLint preset already in the project's flat config? */
function isEslintWired(root: string, det: Detection): boolean {
  return (readRel(root, det.eslintConfigPath) ?? '').includes('eslint-plugin-veneer');
}
