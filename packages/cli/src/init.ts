/**
 * `veneerui init` — wire Veneer into a Vite or Next + Tailwind v4 app.
 *
 * For Vite/Next it does the deterministic, low-risk edits automatically (the token
 * @import, and on Vite the anti-flash plugin) and writes the project-shaped steps
 * (the provider wrapper, the Next <head> script) to a self-removing
 * `VENEER-SETUP.md`, so the developer can finish by hand OR just tell any AI
 * coding agent to complete it.
 *
 * For any *other* React + Tailwind v4 project (Remix, Astro, TanStack Start, …)
 * the CLI can't auto-wire the framework, but the runtime still works — so init
 * drops the agent guide and a *generic* VENEER-SETUP.md (the manual three-step
 * path) instead of bailing. Idempotent and `--dry-run`-able: re-running is a
 * no-op, and nothing here installs packages or rewrites your component tree.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { detect, type Detection } from './detect';
import {
  addTokensImport,
  addViteAntiFlash,
  nextAntiFlashSnippet,
  providerSnippet,
} from './patch';
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

  // 3 — anti-flash.
  log('3. Anti-flash (apply saved theme before first paint)');
  if (det.framework === 'vite') {
    if (det.viteConfigPath) {
      const abs = join(opts.root, det.viteConfigPath);
      const before = readFileSync(abs, 'utf8');
      const { content, changed, reason } = addViteAntiFlash(before);
      if (!changed && content === before && before.includes('@offthegully/veneerui/vite')) {
        log(`   ✓ ${det.viteConfigPath} already uses the veneer() plugin`);
      } else if (!changed) {
        log(`   ! Couldn't safely edit ${det.viteConfigPath} (${reason}). Add manually:`);
        log("       import { veneer } from '@offthegully/veneerui/vite'");
        log('       plugins: [react(), tailwindcss(), veneer()]');
      } else if (opts.dryRun) {
        log(`   → would add the veneer() plugin to ${det.viteConfigPath}`);
      } else {
        writeFileSync(abs, content);
        log(`   ✓ added the veneer() plugin to ${det.viteConfigPath}`);
      }
    } else {
      log('   ! No vite config found. Add the veneer() plugin from @offthegully/veneerui/vite.');
    }
  } else {
    log('   → Next: render <AntiFlashScript/> in app/layout.tsx <head>:');
    indent(log, nextAntiFlashSnippet());
  }

  // 4 — provider (printed, never auto-wrapped).
  log('4. Provider — wrap your app root:');
  indent(log, providerSnippet(det.framework));

  // 5 — agent guide so AI coding tools write themeable components.
  log('\n5. Agent guide (so AI tools write themeable components)');
  const agentDocs = writeAgentGuide(opts, log);

  // 6 — the finish-setup hand-off: the project-shaped steps above, written to a
  // portable, self-removing VENEER-SETUP.md so the dev (or any coding agent) can
  // finish them. Skipped once everything is already wired (so a re-run stays clean).
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
  });
  writeSetupFile(opts, plan, log);

  printOutro(log);
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

/** The shared closing note: Veneer only re-skins token-driven styles; point at doctor. */
function printOutro(log: (line: string) => void): void {
  log('\nVeneer only themes elements that use token utilities (bg-surface, text-text, …).');
  log('On an existing app, `npx veneerui doctor` reports how much is themeable today and');
  log('`npx veneerui migrate` converts the mechanical gotchas. The token rules — what a');
  log('theme can change, and the gotchas that silently break it — are in the AGENTS.md');
  log('guide written above; skim it before building UI.');
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
