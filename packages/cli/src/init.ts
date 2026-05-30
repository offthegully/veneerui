/**
 * `veneerui init` — wire Veneer into an existing Vite or Next + Tailwind v4 app.
 * It does the two deterministic, low-risk edits automatically (the token
 * @import, and on Vite the anti-flash plugin) and prints precise snippets for
 * the steps that are too project-shaped to patch blindly (the provider wrapper,
 * and the Next <head> script). Idempotent and `--dry-run`-able: re-running is a
 * no-op, and nothing here installs packages or rewrites your component tree.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { detect } from './detect';
import {
  addTokensImport,
  addViteAntiFlash,
  nextAntiFlashSnippet,
  providerSnippet,
} from './patch';
import { agentDocTargets, readAgentGuide, upsertAgentGuide } from './agents';

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
    log('Could not detect Vite or Next. Veneer needs a Vite-React or Next (App Router)');
    log('project on Tailwind v4. See docs/integration-vite.md / docs/integration-next.md.');
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
  const guide = readAgentGuide();
  for (const rel of agentDocTargets(opts.root)) {
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

  log('\nNext: `npx veneerui add switcher` to copy a theme switcher into ' + det.componentsDir + '.');
  // Reality-check: Veneer only re-skins elements already on token utilities, so a
  // freshly-wired app mostly won't change yet. Point at doctor so the remaining
  // migration work is a number, not a surprise.
  log('\nHeads up: Veneer only themes elements that use token utilities (bg-surface,');
  log('text-text, …). Your existing hardcoded styles won\'t re-skin until they\'re');
  log('migrated. Run `npx veneerui doctor` to see how much of your UI is themeable today.');
}

function indent(log: (s: string) => void, block: string): void {
  for (const line of block.split('\n')) log(`     ${line}`);
}
