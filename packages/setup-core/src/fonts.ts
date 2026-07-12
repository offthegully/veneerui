/**
 * `veneerui add fonts` — load the fonts the built-in themes name.
 *
 * A theme can only *name* a font; the app must load it, and the family string
 * must match exactly. Figuring out which Fontsource package provides
 * "Fraunces Variable" is the single fiddliest part of adoption, so this prints
 * the exact install command + import lines for the whole bundled set (the same
 * fonts the playground loads), plus the one caveat that silently breaks font
 * theming. It instructs rather than auto-installs — consistent with `init` — and
 * font loading is too entry-shaped (Vite entry vs Next layout vs CSS) to patch
 * blindly.
 *
 * The package/import data is generated from the token schema
 * (`@veneerui/lint-core/font-packages`), so it can never drift from the
 * allowlist the validator enforces.
 */
import { FONT_PACKAGES } from '@veneerui/lint-core/font-packages';
import { detect, type Framework } from './detect';
import { getProfile } from './profiles';
import { installHint, type PackageManager } from './pm';

export interface FontsOptions {
  root: string;
  /** Override the detected package manager for the printed install command. */
  pm?: PackageManager;
  log?: (line: string) => void;
}

/** Where to put the side-effect import lines, per framework. */
function importHint(framework: Framework): string {
  if (framework === 'next') {
    return 'Import them once in app/layout.tsx (a Server Component import is fine — these are CSS side-effects):';
  }
  if (framework === 'vite') {
    return 'Import them in src/main.tsx, above your `./index.css` import:';
  }
  if (getProfile(framework)?.wiring === 'ssr-root') {
    return 'Import them in your root document (React Router app/root.tsx, TanStack Start src/routes/__root.tsx), above your global CSS import:';
  }
  return 'Import them once in your app entry (before your global CSS):';
}

export function runFonts(opts: FontsOptions): void {
  const log = opts.log ?? console.log;
  const det = detect(opts.root);
  const pm = opts.pm ?? det.pm;

  const pkgs = FONT_PACKAGES.map((f) => f.pkg);
  const imports = FONT_PACKAGES.flatMap((f) => f.imports);

  log('Veneer fonts — load the families the built-in themes name.\n');

  log('1. Install the Fontsource packages:');
  log(`   ${installHint(pm, pkgs)}\n`);

  log(`2. ${importHint(det.framework)}`);
  for (const spec of imports) log(`     import '${spec}'`);
  log('');

  log('3. Drive body text from the `font-sans` token — do NOT pin a framework font.');
  log("   e.g. on Next, drop `next/font` from <body className={geist.className}>: a");
  log('   hard-coded family overrides the token and silently disables font theming.');

  log('\nShipping only your own themes? You only need the families they name —');
  log('see docs/fonts.md for the full family ↔ package mapping.');
}
