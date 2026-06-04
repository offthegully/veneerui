/**
 * Token-coverage / "inert axis" report — the counterpart to `veneerui doctor`.
 *
 * `doctor` (and the eslint rule + conformance test) answer "does my UI contain
 * hardcoded *islands*?" — bad values that are present. This answers the silent,
 * opposite question: "which whole theme *axes* does my UI reference *nowhere*?"
 * — good tokens that are absent. A theme can only change what a component opts
 * into: if no element ever writes a box-shadow token, the elevation axis is
 * inert and Neumorphic/Brutalist render your cards as flat rectangles. Nothing
 * errors; the axis just silently does nothing. This turns that into a list.
 *
 * It diffs every token in TOKEN_SCHEMA against every reference in the UI source,
 * deriving each token's reference forms from its v4 `bridge`:
 *   - 'theme' tokens generate a utility (e.g. --color-primary → bg-primary,
 *     --radius-md → rounded-md, --shadow-card → the shadow-card class or the
 *     [box-shadow:var(--shadow-card)] escape hatch),
 *   - 'root' tokens have no utility, so they're only ever referenced via
 *     var(--token) / the (--token) shorthand.
 *
 * Run: `npm run check:coverage`. Report-only (exit 0); pass `--strict` to exit 1
 * when any axis is inert (e.g. to gate CI).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOKEN_SCHEMA } from '../packages/theme/src/schema.ts';
import type { TokenDef } from '../packages/theme/src/types.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Directories whose className/var usage *consumes* tokens. We deliberately do
// NOT scan packages/theme (defaults + generated CSS reference every token) or
// gallery (theme JSON *sets* tokens) — that would make everything look used.
const SCAN_ROOTS = ['apps/playground/src', 'packages/cli/registry'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', '.git']);
const isScannable = (name: string): boolean =>
  /\.(?:tsx|jsx|ts|js|mts|cts|css)$/.test(name) &&
  !name.endsWith('.d.ts') &&
  !/\.test\.[tj]sx?$/.test(name);

function collect(dir: string, acc: { count: number; text: string[] }): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) collect(abs, acc);
    else if (isScannable(name)) {
      acc.text.push(readFileSync(abs, 'utf8'));
      acc.count++;
    }
  }
}

// ── Axes ─────────────────────────────────────────────────────────────────────
// Each token belongs to exactly one axis — the lever a theme pulls. Order is
// significant: the more specific shadow/font prefixes must win over the bare
// `shadow-` / `font-` ones. Hints are the canonical "express it" form, so an
// inert axis comes with the one-liner that fixes it.
interface Axis {
  id: string;
  label: string;
  match: (t: TokenDef) => boolean;
  hint: string;
}
const AXES: Axis[] = [
  { id: 'color', label: 'Brand & status color', hint: 'bg-primary / text-primary / bg-success …',
    match: (t) => t.type === 'color' && /^color-(primary|accent|success|warning|danger|info|focus-ring)/.test(t.name) },
  { id: 'surface', label: 'Surface color', hint: 'bg-surface / bg-surface-raised / bg-surface-sunken',
    match: (t) => t.type === 'color' && (t.name.startsWith('color-surface') || t.name === 'color-overlay-backdrop') },
  { id: 'text-color', label: 'Text color', hint: 'text-text / text-text-muted / text-text-on-primary',
    match: (t) => t.name.startsWith('color-text') },
  { id: 'border-color', label: 'Border color', hint: 'border-border / border-border-strong',
    match: (t) => t.name.startsWith('color-border') },
  { id: 'border-width', label: 'Border width', hint: '[border-width:var(--border-width-default)]',
    match: (t) => t.name.startsWith('border-width') },
  { id: 'focus-ring', label: 'Focus ring geometry', hint: 'focus-visible:[outline-width:var(--focus-ring-width)]',
    match: (t) => t.name.startsWith('focus-ring-') },
  { id: 'radius', label: 'Radius', hint: 'rounded-md / rounded-2xl / rounded-none',
    match: (t) => t.name.startsWith('radius-') },
  { id: 'inset-shadow', label: 'Inset shadow (wells)', hint: '[box-shadow:var(--inset-shadow-sm)]',
    match: (t) => t.name.startsWith('inset-shadow') },
  { id: 'text-shadow', label: 'Text shadow', hint: '[text-shadow:var(--text-shadow-glow)]',
    match: (t) => t.name.startsWith('text-shadow') },
  { id: 'drop-shadow', label: 'Drop shadow', hint: 'drop-shadow-md',
    match: (t) => t.name.startsWith('drop-shadow') },
  { id: 'elevation', label: 'Elevation (box-shadow)', hint: '[box-shadow:var(--shadow-card)]',
    match: (t) => t.name.startsWith('shadow-') },
  { id: 'font-weight', label: 'Font weight', hint: 'font-medium / font-bold / font-black',
    match: (t) => t.name.startsWith('font-weight') },
  { id: 'font-family', label: 'Type family', hint: 'font-display / font-serif / font-mono',
    match: (t) => t.name.startsWith('font-') },
  { id: 'font-size', label: 'Type scale', hint: 'text-sm / text-2xl / text-6xl',
    match: (t) => /^text-(xs|sm|base|lg|xl|\dxl)$/.test(t.name) },
  { id: 'leading', label: 'Line height', hint: 'leading-tight / leading-relaxed',
    match: (t) => t.name.startsWith('leading-') },
  { id: 'tracking', label: 'Letter spacing', hint: 'tracking-tight / tracking-widest',
    match: (t) => t.name.startsWith('tracking-') },
  { id: 'spacing', label: 'Spacing base unit', hint: 'p-4 / gap-2 / p-4.5 (decimal multiplier)',
    match: (t) => t.name === 'spacing' },
  { id: 'blur', label: 'Blur', hint: 'blur-md / backdrop-blur-md',
    match: (t) => t.name.startsWith('blur-') },
  { id: 'icon-stroke', label: 'Icon stroke width', hint: '[stroke-width:var(--icon-stroke-width)]',
    match: (t) => t.name === 'icon-stroke-width' },
  { id: 'gradient', label: 'Gradient', hint: 'bg-(image:--gradient-primary)',
    match: (t) => t.name.startsWith('gradient-') },
  { id: 'opacity-token', label: 'Opacity tokens', hint: 'opacity-(--opacity-disabled)',
    match: (t) => t.name.startsWith('opacity-') },
  { id: 'motion-duration', label: 'Motion duration', hint: 'duration-[calc(var(--duration-default)*1ms)]',
    match: (t) => t.name.startsWith('duration-') },
  { id: 'motion-easing', label: 'Motion easing', hint: 'ease-default / ease-snappy',
    match: (t) => t.name.startsWith('ease-') },
];

const axisFor = (t: TokenDef): Axis | undefined => AXES.find((a) => a.match(t));

// ── Reference detection ──────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Class boundary: a class segment is delimited by non-(word|hyphen|slash) on the
// left and non-(word|hyphen) on the right (a trailing `/` opacity modifier is ok).
const L = '(?<![\\w-])';
const R = '(?![\\w-])';

/** All the ways a single token can legitimately appear in component source. */
function patterns(t: TokenDef): RegExp[] {
  const n = t.name;
  // Every token is referenceable through its custom property (the escape hatch
  // for shadows/border-width/duration, and the only form for `root` tokens).
  const pats: RegExp[] = [new RegExp('--' + esc(n) + R)];
  if (t.type === 'color') {
    const suf = esc(n.replace(/^color-/, ''));
    pats.push(new RegExp(L + '(?:bg|text|border|ring|outline|fill|stroke|decoration|caret|accent|divide|placeholder|from|via|to)-' + suf + R));
  } else if (n.startsWith('radius-')) {
    const suf = esc(n.replace(/^radius-/, ''));
    pats.push(new RegExp(L + 'rounded(?:-(?:t|r|b|l|tl|tr|br|bl|s|e|ss|se|ee|es))?-' + suf + R));
  } else if (n.startsWith('font-weight-')) {
    pats.push(new RegExp(L + 'font-' + esc(n.replace(/^font-weight-/, '')) + R));
  } else if (n === 'spacing') {
    pats.push(new RegExp(L + '(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|w|h|min-w|min-h|max-w|max-h|size|inset|inset-x|inset-y|top|right|bottom|left|start|end)-\\d'));
  } else if (n.startsWith('blur-')) {
    pats.push(new RegExp(L + '(?:backdrop-)?blur-' + esc(n.replace(/^blur-/, '')) + R));
  } else if (n.startsWith('gradient-') || n.startsWith('opacity-') || n.startsWith('duration-')) {
    // root-bridge tokens — no utility; the `--name` pattern above is the only form.
  } else {
    // Tokens whose utility class IS the token name: shadows, text sizes,
    // leading, tracking, ease, font families, text/drop/inset shadows.
    pats.push(new RegExp(L + esc(n) + R));
  }
  return pats;
}

// ── Run ──────────────────────────────────────────────────────────────────────
const acc = { count: 0, text: [] as string[] };
for (const rel of SCAN_ROOTS) collect(join(root, rel), acc);
const corpus = acc.text.join('\n');

const referenced = new Map<string, boolean>();
for (const t of TOKEN_SCHEMA) referenced.set(t.name, patterns(t).some((re) => re.test(corpus)));

interface AxisResult { axis: Axis; total: number; hit: number }
const results: AxisResult[] = AXES.map((axis) => {
  const members = TOKEN_SCHEMA.filter((t) => axisFor(t) === axis);
  return { axis, total: members.length, hit: members.filter((t) => referenced.get(t.name)).length };
}).filter((r) => r.total > 0);

const inert = results.filter((r) => r.hit === 0);

const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - s.length));
console.log('\nVeneer token-coverage — which theme axes your UI actually expresses\n');
console.log(`Scanned ${acc.count} file(s) under ${SCAN_ROOTS.join(', ')}.\n`);
console.log(`  ${pad('AXIS', 26)}${pad('REFERENCED', 12)}STATUS`);
for (const r of results) {
  const status = r.hit === 0 ? '⚠ INERT' : r.hit < r.total ? 'ok' : 'ok ✓';
  console.log(`  ${pad(r.axis.label, 26)}${pad(`${r.hit}/${r.total}`, 12)}${status}`);
}

if (inert.length === 0) {
  console.log('\n✓ Every theme axis is referenced somewhere — no silently-inert axes.\n');
  process.exit(0);
}

console.log(`\n⚠ ${inert.length} inert axis/axes — themes that vary these will NOT visibly change your UI:`);
for (const r of inert) console.log(`   • ${r.axis.label} — express it with: ${r.axis.hint}`);
console.log('\nThen confirm by eye: render the view under a theme that stresses the axis');
console.log('(Brutalist=borders/shadow/radius · Neumorphic=elevation · Editorial=type · Glassmorphic/Neon=effects).\n');

process.exit(process.argv.includes('--strict') ? 1 : 0);
