/**
 * `veneerui init` — wire Veneer into a React + Tailwind v4 app (any framework in
 * the profile registry: Vite, Next, React Router 7, TanStack Start).
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
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { detect, type Detection } from './detect';
import { FRAMEWORK_PROFILES, getProfile } from './profiles';
import {
  addEslintRule,
  addTokensImport,
  addViteAntiFlash,
  eslintConfigSnippet,
  nextAntiFlashSnippet,
  providerSnippet,
  ssrRootSnippet,
} from './patch';
import { createNextProviders, wireNextLayout, wireSsrRoot, wrapEntryWithProvider } from './entry-patch';
import { agentDocTargets, readAgentGuide, upsertAgentGuide } from './agents';
import {
  buildSetupPlan,
  EXPERIMENTAL_FRAMEWORKS,
  EXPO_GUIDE_URL,
  INTEGRATION_GUIDE_URL,
  SETUP_FILE,
} from './setup-plan';
import { execHint, installHint, runHint, type PackageManager } from './pm';

export interface InitOptions {
  root: string;
  dryRun?: boolean;
  /** Override the detected package manager for the printed instructions. */
  pm?: PackageManager;
  /**
   * Set by `create-veneerui` when init runs inside a fresh scaffold: skips the
   * create-next-app template-pin warnings (the scaffolder strips those pins
   * itself, right after init) and the "add switcher" outro hint (the scaffold
   * already adds one).
   */
  fromScaffold?: boolean;
  log?: (line: string) => void;
}

export function runInit(opts: InitOptions): void {
  const log = opts.log ?? console.log;
  const det = detect(opts.root);
  const pm = opts.pm ?? det.pm;
  const dry = opts.dryRun ? ' (dry-run)' : '';

  // Native apps wire through NativeWind, not this web engine — a generic web
  // checklist here would instruct edits that don't apply. Point at the real paths.
  if (det.hasExpo) {
    log('This looks like an Expo / React Native app — `veneerui init` wires web frameworks only.');
    log('For native, scaffold fresh with `npm create veneerui@latest -- --framework expo`, or');
    log(`wire an existing app by hand via the Expo guide: ${EXPO_GUIDE_URL}`);
    return;
  }

  log(`Veneer init${dry}`);
  log(`  framework: ${det.framework}`);
  log(`  @offthegully/veneerui installed: ${det.hasVeneerTheme ? 'yes' : 'no'}`);
  log(`  tailwindcss present: ${det.hasTailwind ? 'yes' : 'no'}\n`);

  // Refuse Tailwind < 4 up front: tokens.css is @theme-based, so on v3 every edit
  // below would break the build (or silently no-op) — with a cheerful ✓ in the log.
  if (det.tailwindMajor !== undefined && det.tailwindMajor < 4) {
    throw new Error(
      `Tailwind v${det.tailwindMajor} detected — Veneer requires Tailwind v4 (its tokens.css uses v4's @theme syntax). ` +
        'Upgrade first (https://tailwindcss.com/docs/upgrade-guide), then re-run init.',
    );
  }

  if (det.framework === 'unknown') {
    runOtherFramework(opts, det, log);
    return;
  }

  // 1 — dependencies (we never auto-install; we instruct).
  // The Tailwind hint follows the profile's pipeline axis: `@tailwindcss/vite` for
  // Vite-built frameworks, `@tailwindcss/postcss` where Tailwind is builtin (Next).
  const twPkgs =
    getProfile(det.framework)?.tailwind === 'builtin'
      ? ['tailwindcss', '@tailwindcss/postcss']
      : ['tailwindcss', '@tailwindcss/vite'];
  log('1. Dependencies');
  if (!det.hasVeneerTheme) log(`   → run: ${installHint(pm, ['@offthegully/veneerui'])}  (before \`${runHint(pm, 'dev')}\`)`);
  else log('   ✓ @offthegully/veneerui already a dependency');
  if (!det.hasTailwind) log(`   ! Tailwind v4 not found — Veneer requires it (${installHint(pm, twPkgs)}).`);
  if (!det.hasEslintPlugin) log(`   → run: ${installHint(pm, ['eslint-plugin-veneer'], true)}  (the veneer/* themeability lint rules)`);
  else log('   ✓ eslint-plugin-veneer already a dependency');

  // 2 — token @import in the global stylesheet.
  log('2. Token CSS');
  let tokenImportWired = false;
  if (det.globalCssPath) {
    const abs = join(opts.root, det.globalCssPath);
    const before = readFileSync(abs, 'utf8');
    const { content, changed } = addTokensImport(before);
    tokenImportWired = true; // already there, written below, or would-write on dry-run
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
  // records it in VENEER-SETUP.md for you (or your agent) to finish. The wiring
  // *shape* is the framework profile's `wiring` axis — not a vite/next binary.
  // Each wirer reports what is wired *after this run* (dry-run counts a would-write
  // as wired), so the plan below matches what actually happened — on dry-run too.
  log('3. Provider + anti-flash');
  const wiring = getProfile(det.framework)?.wiring;
  const wired =
    wiring === 'vite-spa'
      ? wireViteEntry(opts, det, log)
      : wiring === 'next-app'
        ? wireNextEntry(opts, det, log)
        : wireSsrRootEntry(opts, det, log);

  // 3b — the create-next-app template ships its own font pin + color system that
  // silently defeat theming. The scaffolder strips them on a fresh app; on an
  // existing app we only detect and warn (init never rewrites opinionated files).
  const pins = det.framework === 'next' && !opts.fromScaffold ? detectNextTemplatePins(opts.root, det) : { fontPinned: false, cssPinned: false };
  if (pins.fontPinned) {
    log('   ! your layout still pins the template font via next/font — a hard-coded family');
    log('     overrides the font-sans token and silently disables font theming (step in VENEER-SETUP.md).');
  }
  if (pins.cssPinned) {
    log('   ! your globals.css still ships the create-next-app color system (--background /');
    log('     @theme inline) — it pins the page surface regardless of theme (step in VENEER-SETUP.md).');
  }

  // 4 — the lint gate: enable the veneer/* themeability rules so a stray
  // bg-blue-500 / shadow-md / p-[18px] / bg-opacity-50 fails lint/CI instead of
  // silently shipping an un-themeable island.
  log('\n4. Lint gate (themeability rules)');
  const eslintWired = wireEslint(opts, det, log);

  // 5 — agent guide so AI coding tools write themeable components.
  log('\n5. Agent guide (so AI tools write themeable components)');
  const agentDocs = writeAgentGuide(opts, log);

  // 6 — the finish-setup hand-off: whatever the patchers couldn't apply is written
  // to a portable, self-removing VENEER-SETUP.md. Skipped once everything is wired
  // (the common case on a fresh app), so a re-run stays clean.
  log('\n6. Finish setup');
  const plan = buildSetupPlan({
    framework: det.framework,
    pm,
    entryPath: det.entryPath,
    globalCssPath: det.globalCssPath,
    viteConfigPath: det.viteConfigPath,
    agentDocs,
    tokenImportWired,
    providerWired: wired.providerWired,
    antiFlashWired: wired.antiFlashWired,
    eslintWired,
    nextFontPinned: pins.fontPinned,
    nextTemplateCssPinned: pins.cssPinned,
  });
  writeSetupFile(opts, plan, log);

  // The one blocking command, repeated last — a reader who skimmed past step 1
  // otherwise hits an unexplained resolve error on their first `dev`.
  if (!det.hasVeneerTheme || !det.hasEslintPlugin) {
    const pending = [
      ...(!det.hasVeneerTheme ? [installHint(pm, ['@offthegully/veneerui'])] : []),
      ...(!det.hasEslintPlugin ? [installHint(pm, ['eslint-plugin-veneer'], true)] : []),
    ];
    log(`\n! Before \`${runHint(pm, 'dev')}\`, install what the wiring above imports:`);
    for (const cmd of pending) log(`    ${cmd}`);
  }

  printOutro(log, pm, agentDocs, opts.fromScaffold);
}

/** What the provider/anti-flash wiring left in place after this run. */
interface WiredState {
  providerWired: boolean;
  antiFlashWired: boolean;
}

/**
 * Detect the create-next-app template pins that defeat theming on an existing app:
 * the `next/font` (Geist) pin in the layout, and the template's own color system
 * in globals.css. Detection only — the removal steps land in VENEER-SETUP.md.
 */
function detectNextTemplatePins(root: string, det: Detection): { fontPinned: boolean; cssPinned: boolean } {
  const layout = readRel(root, det.entryPath ?? 'app/layout.tsx') ?? '';
  const css = readRel(root, det.globalCssPath) ?? '';
  return {
    fontPinned: /from\s*["']next\/font\//.test(layout),
    cssPinned: css.includes('--background') && css.includes('@theme inline'),
  };
}

/** Vite: the veneer() anti-flash plugin in the config, and the `<ThemeProvider>` wrap in the entry. */
function wireViteEntry(opts: InitOptions, det: Detection, log: (line: string) => void): WiredState {
  let antiFlashWired = false;
  if (det.viteConfigPath) {
    const abs = join(opts.root, det.viteConfigPath);
    const before = readFileSync(abs, 'utf8');
    if (before.includes('@offthegully/veneerui/vite')) {
      log(`   ✓ ${det.viteConfigPath} already uses the veneer() plugin`);
      antiFlashWired = true;
    } else {
      const { content, changed, reason } = addViteAntiFlash(before);
      if (!changed) {
        log(`   ! couldn't edit ${det.viteConfigPath} (${reason}) — add it manually:`);
        log("       import { veneer } from '@offthegully/veneerui/vite'  // plugins: [react(), veneer()]");
      } else if (opts.dryRun) {
        log(`   → would add the veneer() plugin to ${det.viteConfigPath}`);
        antiFlashWired = true;
      } else {
        writeFileSync(abs, content);
        log(`   ✓ added the veneer() plugin to ${det.viteConfigPath}`);
        antiFlashWired = true;
      }
    }
  } else {
    log('   ! no vite config found — add the veneer() plugin from @offthegully/veneerui/vite manually.');
  }

  let providerWired = false;
  if (det.entryPath) {
    const abs = join(opts.root, det.entryPath);
    const before = readFileSync(abs, 'utf8');
    // Anchored on our import, not the bare identifier — a ThemeProvider from
    // another library (next-themes, …) must not count as wired.
    if (before.includes('ThemeProvider') && before.includes('@offthegully/veneerui')) {
      log(`   ✓ ${det.entryPath} already wraps the root in <ThemeProvider>`);
      providerWired = true;
    } else {
      const { content, changed, reason } = wrapEntryWithProvider(before);
      if (!changed) {
        log(`   ! couldn't wrap ${det.entryPath} (${reason}) — wrap your root manually:`);
        indent(log, providerSnippet('vite', false));
      } else if (opts.dryRun) {
        log(`   → would wrap the root in ${det.entryPath} with <ThemeProvider>`);
        providerWired = true;
      } else {
        writeFileSync(abs, content);
        log(`   ✓ wrapped the root in ${det.entryPath} with <ThemeProvider>`);
        providerWired = true;
      }
    }
  } else {
    log('   ! no entry file found — wrap your root in <ThemeProvider> manually:');
    indent(log, providerSnippet('vite', false));
  }
  return { providerWired, antiFlashWired };
}

/** Next: a client providers.tsx, plus providers + anti-flash + suppressHydrationWarning in the layout. */
function wireNextEntry(opts: InitOptions, det: Detection, log: (line: string) => void): WiredState {
  const layoutRel = det.entryPath ?? 'app/layout.tsx';
  const layoutAbs = join(opts.root, layoutRel);
  const providersRel = join(dirname(layoutRel), 'providers.tsx');
  const providersAbs = join(dirname(layoutAbs), 'providers.tsx');

  // No layout ⇒ nothing to wire into; don't leave a stray providers.tsx behind.
  if (!existsSync(layoutAbs)) {
    log(`   ! no ${layoutRel} found — add the provider + anti-flash manually:`);
    indent(log, nextAntiFlashSnippet());
    return { providerWired: false, antiFlashWired: false };
  }

  // An existing providers.tsx is the user's own provider stack. Ours (or one that
  // already nests Veneer's ThemeProvider) is fine; anything else must NOT be
  // wrapped blindly — it may not export `Providers`, and a ✓ here would hide that
  // Veneer's provider is still missing.
  if (existsSync(providersAbs)) {
    const src = readFileSync(providersAbs, 'utf8');
    if (!(src.includes('ThemeProvider') && src.includes('@offthegully/veneerui'))) {
      log(`   ! ${providersRel} exists but doesn't use Veneer's <ThemeProvider> — nest it inside`);
      log('     your provider stack, then wire the layout manually:');
      indent(log, nextAntiFlashSnippet());
      return { providerWired: false, antiFlashWired: false };
    }
    log(`   ✓ ${providersRel} already wraps children in Veneer's <ThemeProvider>`);
  } else if (opts.dryRun) {
    log('   → would create the client providers.tsx beside the layout');
  } else {
    writeFileSync(providersAbs, createNextProviders());
    log(`   ✓ created ${providersRel}`);
  }

  const before = readFileSync(layoutAbs, 'utf8');
  if (before.includes('<Providers>') && before.includes('AntiFlashScript')) {
    log(`   ✓ ${layoutRel} already wired (providers + anti-flash)`);
    return { providerWired: true, antiFlashWired: true };
  }
  const { content, changed, reason } = wireNextLayout(before);
  if (!changed) {
    log(`   ! couldn't wire ${layoutRel} (${reason}) — add it manually:`);
    indent(log, nextAntiFlashSnippet());
    return { providerWired: false, antiFlashWired: false };
  }
  if (opts.dryRun) {
    log(`   → would wire ${layoutRel} (providers + anti-flash + suppressHydrationWarning)`);
  } else {
    writeFileSync(layoutAbs, content);
    log(`   ✓ wired ${layoutRel} (providers + anti-flash + suppressHydrationWarning)`);
  }
  return { providerWired: true, antiFlashWired: true };
}

/**
 * SSR root document (React Router 7, TanStack Start, …): wrap `{children}` in
 * `<ThemeProvider>` and inline the anti-flash `<script>` in the root `<head>` —
 * no separate providers file or `/next` adapter (these frameworks have no RSC
 * boundary). Patches the root when its shape is recognized; bails (→ manual plan)
 * otherwise.
 */
function wireSsrRootEntry(opts: InitOptions, det: Detection, log: (line: string) => void): WiredState {
  if (!det.entryPath) {
    log('   ! no root document found — wrap your root + add the anti-flash script manually:');
    indent(log, ssrRootSnippet());
    return { providerWired: false, antiFlashWired: false };
  }
  const abs = join(opts.root, det.entryPath);
  const before = readFileSync(abs, 'utf8');
  // `getAntiFlashScript` is ours; requiring the package import too keeps a foreign
  // ThemeProvider from counting as wired.
  if (before.includes('ThemeProvider') && before.includes('getAntiFlashScript') && before.includes('@offthegully/veneerui')) {
    log(`   ✓ ${det.entryPath} already wired (provider + anti-flash)`);
    return { providerWired: true, antiFlashWired: true };
  }
  const { content, changed, reason } = wireSsrRoot(before);
  if (!changed) {
    log(`   ! couldn't wire ${det.entryPath} (${reason}) — add it manually:`);
    indent(log, ssrRootSnippet());
    return { providerWired: false, antiFlashWired: false };
  }
  if (opts.dryRun) {
    log(`   → would wire ${det.entryPath} (provider + anti-flash + suppressHydrationWarning)`);
  } else {
    writeFileSync(abs, content);
    log(`   ✓ wired ${det.entryPath} (provider + anti-flash + suppressHydrationWarning)`);
  }
  return { providerWired: true, antiFlashWired: true };
}

/**
 * Enable Veneer's `veneer/*` themeability rules in the project's ESLint flat
 * config — the `recommended` preset (no-hardcoded-colors, no-baked-shadow,
 * no-island-spacing, no-dead-opacity), the executable half of the token contract
 * (the agent guide is the prose half). Patches the config the scaffolders emit; on
 * an unfamiliar shape it prints the snippet and step 6 records it in VENEER-SETUP.md.
 */
function wireEslint(opts: InitOptions, det: Detection, log: (line: string) => void): boolean {
  if (!det.eslintConfigPath) {
    if (det.legacyEslintConfigPath) {
      log(`   ! found ${det.legacyEslintConfigPath}, but the veneer preset needs ESLint *flat* config`);
      log('     (eslint.config.js). Migrate first — https://eslint.org/docs/latest/use/configure/migration-guide —');
      log('     then re-run init, or add the preset to the new config manually:');
    } else {
      log('   ! no ESLint flat config found — add the veneer preset manually:');
    }
    indent(log, eslintConfigSnippet());
    return false;
  }
  const abs = join(opts.root, det.eslintConfigPath);
  const before = readFileSync(abs, 'utf8');
  if (before.includes('eslint-plugin-veneer')) {
    log(`   ✓ ${det.eslintConfigPath} already enables veneer.configs.recommended`);
    return true;
  }
  const { content, changed, reason } = addEslintRule(before);
  if (!changed) {
    log(`   ! couldn't edit ${det.eslintConfigPath} (${reason}) — add it manually:`);
    indent(log, eslintConfigSnippet());
    return false;
  }
  if (opts.dryRun) {
    log(`   → would add veneer.configs.recommended to ${det.eslintConfigPath}`);
  } else {
    writeFileSync(abs, content);
    log(`   ✓ added veneer.configs.recommended to ${det.eslintConfigPath}`);
  }
  return true;
}

/**
 * Anything the profile registry doesn't recognize. The CLI can't auto-wire it, but
 * Veneer's runtime is just React 19 + Tailwind v4, so a plausible React + Tailwind
 * project still gets the agent guide and a *generic* VENEER-SETUP.md (the manual
 * path) — making the "tell your agent to finish it" flow work everywhere.
 */
function runOtherFramework(opts: InitOptions, det: Detection, log: (line: string) => void): void {
  const pm = opts.pm ?? det.pm;
  const wired = FRAMEWORK_PROFILES.map((p) => p.label).join(', ');
  log(`Could not auto-detect a framework \`init\` wires for you (${wired}).`);
  log("Veneer's runtime is framework-agnostic (React 19 + Tailwind v4); these popular");
  log('setups should work via the manual steps, though they are not fully tested yet:');
  log(`  ${EXPERIMENTAL_FRAMEWORKS.join(', ')}.`);

  const plausible =
    existsSync(join(opts.root, 'package.json')) &&
    (det.hasReact || det.hasTailwind || det.hasVeneerTheme);
  if (!plausible) {
    log("\nThis doesn't look like a React + Tailwind project yet. Once `react` and");
    log(`\`tailwindcss\` are installed, re-run \`${execHint(pm, 'veneerui init')}\`, or follow the`);
    log(`"Other React frameworks" section of the integration guide by hand:`);
    log(`  ${INTEGRATION_GUIDE_URL}`);
    return;
  }

  log('\n1. Dependencies');
  if (!det.hasVeneerTheme) log(`   → run: ${installHint(pm, ['@offthegully/veneerui'])}  (before \`${runHint(pm, 'dev')}\`)`);
  else log('   ✓ @offthegully/veneerui already a dependency');
  if (!det.hasTailwind) log(`   ! Tailwind v4 not found — Veneer requires it (${installHint(pm, ['tailwindcss'])}).`);
  // The setup file below includes the lint-gate step, so name its dependency here too.
  if (!det.hasEslintPlugin) log(`   → run: ${installHint(pm, ['eslint-plugin-veneer'], true)}  (the veneer/* themeability lint rules)`);
  else log('   ✓ eslint-plugin-veneer already a dependency');

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
    pm,
    globalCssPath: tokenImportWired ? det.globalCssPath : undefined,
    agentDocs,
    tokenImportWired,
    providerWired: false,
    antiFlashWired: false,
    eslintWired: false,
  });
  writeSetupFile(opts, plan, log);

  printOutro(log, pm, agentDocs, opts.fromScaffold);
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
    // A leftover setup file from an earlier run now asserts the opposite of
    // reality — and instructs any agent that reads it to redo work. It's
    // init-owned and transient by design, so clean it up.
    if (existsSync(join(opts.root, SETUP_FILE))) {
      if (opts.dryRun) log(`   → would remove the stale ${SETUP_FILE} (everything it lists is wired)`);
      else {
        rmSync(join(opts.root, SETUP_FILE));
        log(`   ✓ removed the stale ${SETUP_FILE} — everything it listed is wired.`);
      }
    }
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

/** The shared closing note: Veneer only re-skins token-driven styles; point at the agent guide. */
function printOutro(log: (line: string) => void, pm: PackageManager, agentDocs: string[], fromScaffold?: boolean): void {
  const docs = agentDocs.length ? agentDocs.join(' / ') : 'AGENTS.md';
  log('\nVeneer only themes elements that use token utilities (bg-surface, text-text, …).');
  log('On an existing app, existing styles re-skin once they move onto tokens. The token');
  log('rules — what a theme can change, and the gotchas that silently break it — are in');
  log(`the ${docs} guide written above; skim it before building UI.`);
  // A fresh scaffold already ships the switcher (and its own outro) — these hints
  // are for the existing-app flow, where nothing else surfaces them on a clean run.
  if (!fromScaffold) {
    log('\nOptional next steps:');
    log(`  ${execHint(pm, 'veneerui add switcher')}  — drop in a theme switcher UI`);
    log(`  ${execHint(pm, 'veneerui add fonts')}     — load the fonts the built-in themes name`);
  }
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

