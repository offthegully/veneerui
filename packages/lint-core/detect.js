/**
 * Shared hardcoded-color detector.
 *
 * One definition of "hardcoded color", consumed by every Veneer enforcer:
 *   - the `veneer/no-hardcoded-colors` ESLint rule (playground + eslint-plugin-veneer), and
 *   - the conformance test (`apps/playground/src/conformance.test.ts`).
 *
 * The contract (see AGENTS.md): components express every visual value through a
 * semantic token utility (`bg-primary`, `text-text-muted`, `border-border`, …)
 * so a theme can reach all of them. A hardcoded color is an island no theme can
 * re-skin. This module spots the three ways an island sneaks in.
 *
 * Plain JS (not TS) on purpose: ESLint loads rule files directly with no
 * transpile step, Vitest imports it just as happily, and the zero-dep CLI
 * bundles it via tsup.
 */

/** Tailwind's default palette names — the ones a theme does NOT own. */
const PALETTE = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
].join('|');

/** Utility prefixes that take a color in Tailwind v4. */
const COLOR_PREFIX =
  '(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|from|via|to|fill|stroke|' +
  'outline|decoration|divide|placeholder|caret|accent|shadow|inset-shadow|text-shadow)';

const SHADE = '(?:50|100|200|300|400|500|600|700|800|900|950)';

/**
 * 1. Palette-shade utilities like `bg-blue-500`, `text-red-600/50`, and the
 *    bare `bg-black` / `text-white` literals. Token utilities never carry a
 *    numeric shade (`bg-primary`, not `bg-primary-500`), so this can't match
 *    them. A leading boundary keeps it from matching mid-identifier.
 */
const PALETTE_UTILITY_RE = new RegExp(
  `(?:^|[\\s"'\`(){}\\[\\]:])${COLOR_PREFIX}-(?:(?:${PALETTE})-${SHADE}|black|white)(?:\\/\\d{1,3})?\\b`,
  'g',
);

/**
 * 2. Arbitrary color values jammed into a utility: `bg-[#fff]`,
 *    `text-[rgb(0,0,0)]`, `[color:#333]`, `[border-color:hsl(...)]`. A `var(...)`
 *    arbitrary value (`bg-[image:var(--gradient-primary)]`,
 *    `[border-width:var(--border-width-default)]`) is the *sanctioned* escape
 *    hatch and deliberately does not match.
 */
const COLOR_FN = '(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color|hwb)';
const ARBITRARY_COLOR_RE = new RegExp(
  // utility-[#hex|colorfn(...)]  OR  [css-color-prop:#hex|colorfn(...)]
  `${COLOR_PREFIX}-\\[(?:#[0-9a-fA-F]{3,8}|${COLOR_FN}\\()` +
    `|\\[(?:color|background-color|border-color|fill|stroke|outline-color|caret-color|accent-color|text-decoration-color):\\s*(?:#[0-9a-fA-F]{3,8}|${COLOR_FN}\\()`,
  'gi',
);

/**
 * 3. Bare color literals — hex, or a color function call — as they'd appear in
 *    an inline `style` value (`style={{ color: '#fff' }}`). Scoped by the caller
 *    to style contexts; token definitions and test fixtures legitimately hold
 *    hex elsewhere.
 */
const BARE_COLOR_RE = new RegExp(
  `#[0-9a-fA-F]{3,8}\\b|${COLOR_FN}\\(`,
  'gi',
);

function matchAll(text, re) {
  const out = [];
  // Each RegExp is module-global; reset lastIndex so repeated calls are pure.
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ value: m[0].trim(), index: m.index });
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width
  }
  return out;
}

/**
 * Class-string violations: palette utilities + arbitrary color utilities. These
 * patterns are class-syntax-specific, so they're safe to run against any string
 * literal without false-positiving on schema hex or test fixtures.
 */
export function findClassColorViolations(text) {
  return [
    ...matchAll(text, PALETTE_UTILITY_RE).map((m) => ({ ...m, kind: 'palette-utility' })),
    ...matchAll(text, ARBITRARY_COLOR_RE).map((m) => ({ ...m, kind: 'arbitrary-color' })),
  ];
}

/** Bare hex / color-function literals — only meaningful in inline-style context. */
export function findBareColorLiterals(text) {
  return matchAll(text, BARE_COLOR_RE).map((m) => ({ ...m, kind: 'inline-color' }));
}

/* ── Non-color island detectors ──────────────────────────────────────────────
 *
 * Color is one axis; these cover three *other* axes whose islands fail silently
 * (AGENTS.md §3/§9) — nothing renders wrong loudly, it just stops being
 * themeable: a named shadow bakes its geometry at build time so a theme can't
 * re-skin it, an off-scale `p-[18px]` won't rescale with `--spacing`, and a v4
 * `*-opacity-N` utility is dead (renders fully opaque). Each finder returns the
 * same `{ value, index, kind }` shape the color finders use, plus an optional
 * `fix`: the token-driven replacement the ESLint rule applies as an autofix.
 *
 * Unlike color (whose shapes can never appear in a token name), these match
 * Tailwind class *syntax* that collides with ordinary strings — `shadow-card` is
 * an island in a className but a legitimate token name in
 * `tokenValue(t,'shadow-card')`, and prose can mention `shadow-md`. The finders
 * make NO attempt to tell a class from a non-class string: the ESLint rule only
 * ever feeds them text drawn from `className` / class-merge-call contexts (see
 * rule.js), so every string reaching here is already known to be classes.
 */

/**
 * Zero-width left boundary, so a match's `index` points exactly at the utility
 * (the precise offset an autofix needs). Excludes `-`, so we never match inside
 * `drop-shadow-*` (themeable), the `[box-shadow:var(--shadow-*)]` escape hatch,
 * or a `--shadow-*` custom property.
 */
const LEFT = '(?<![\\w-])';

/**
 * Named shadows whose geometry Tailwind v4 bakes at build time, keyed by the
 * exact per-type token scales Veneer actually defines (packages/theme/src/
 * schema.ts — the drift guard in apps/playground/src/conformance.test.ts keeps
 * these in sync). The scales differ per type, so a single flat list would
 * autofix to nonexistent tokens like `var(--inset-shadow-xl)`, which resolves to
 * no shadow at all — strictly worse than the original.
 */
export const SHADOW_SCALES = Object.freeze({
  'shadow': ['2xs', 'sm', 'md', 'lg', 'xl', '2xl', 'card', 'glow'],
  'inset-shadow': ['sm', 'md', 'lg'],
  'text-shadow': ['sm', 'md', 'lg', 'glow'],
});

// inset-/text- before shadow so the longest type wins; trailing `(?![\w/-])`
// excludes color shadows (`shadow-primary`), `shadow-none`, and the
// `shadow-card/50` opacity-modifier form (whose autofix would be broken).
const shadowBranch = (type) => `(${type})-(${SHADOW_SCALES[type].join('|')})`;
const BAKED_SHADOW_RE = new RegExp(
  `${LEFT}(?:${shadowBranch('inset-shadow')}|${shadowBranch('text-shadow')}|${shadowBranch('shadow')})(?![\\w/-])`,
  'g',
);

/** Spacing-scale utilities (padding/margin/gap/space) — the ones tied to `--spacing`. */
const SPACING_PREFIX = '(p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])';
// Integer px only: an integer ÷ 4 always lands on Tailwind v4's 0.25 spacing grid,
// so every flag has a valid autofix (`p-[18px]` → `p-4.5`, `p-[1px]` → `p-0.25`).
// Fractional px (`p-[1.5px]` → 0.375, off-grid) and non-px (`w-[100vw]`,
// `max-w-[65ch]`) are deliberately left alone.
const ISLAND_SPACING_RE = new RegExp(`${LEFT}(-?)${SPACING_PREFIX}-\\[(\\d+)px\\]`, 'g');

/** Tailwind v3 opacity utilities removed in v4 (no-ops → element renders opaque). */
const DEAD_OPACITY_RE = new RegExp(
  `${LEFT}(?:bg|text|border|ring|divide|placeholder)-opacity-\\d{1,3}\\b`,
  'g',
);

/** Run a global regex, building a result per match (return null to drop a match). */
function scan(text, re, build) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    const item = build(m);
    if (item) out.push(item);
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width
  }
  return out;
}

/**
 * Named shadow / inset-shadow / text-shadow utilities (baked geometry → not
 * themeable). No lone-token guard: the rule only feeds class-context strings, so
 * a lone `shadow-md` here really is a className island and should be flagged.
 */
export function findBakedShadows(text) {
  return scan(text, BAKED_SHADOW_RE, (m) => {
    // Exactly one of the three type branches matched; pick its (type, name) pair.
    const type = m[1] ?? m[3] ?? m[5];
    const name = m[2] ?? m[4] ?? m[6];
    const prop = type === 'text-shadow' ? 'text-shadow' : 'box-shadow';
    return { value: m[0], index: m.index, kind: 'baked-shadow', fix: `[${prop}:var(--${type}-${name})]` };
  });
}

/** Off-scale (integer) px on a spacing utility — an island that won't rescale with `--spacing`. */
export function findIslandSpacing(text) {
  return scan(text, ISLAND_SPACING_RE, (m) => {
    const neg = m[1];
    const prefix = m[2];
    // Only margins are negatable in Tailwind; `-gap-[4px]` / `-p-[8px]` are
    // already-invalid input, so drop them rather than emit a bogus negated fix.
    if (neg && !prefix.startsWith('m')) return null;
    // base `--spacing` is 0.25rem = 4px, so `[18px]` → 18/4 = 4.5; the multiplier
    // is theme-relative, which is the whole point — it rescales with the theme.
    const mult = String(Number(m[3]) / 4);
    return { value: m[0], index: m.index, kind: 'island-spacing', fix: `${neg}${prefix}-${mult}` };
  });
}

/** Dead-in-v4 `*-opacity-N` utilities. No safe single-token autofix (merge into a slash). */
export function findDeadOpacity(text) {
  return scan(text, DEAD_OPACITY_RE, (m) => ({ value: m[0], index: m.index, kind: 'dead-opacity' }));
}

export {
  PALETTE_UTILITY_RE,
  ARBITRARY_COLOR_RE,
  BARE_COLOR_RE,
  BAKED_SHADOW_RE,
  ISLAND_SPACING_RE,
  DEAD_OPACITY_RE,
};
