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

export { PALETTE_UTILITY_RE, ARBITRARY_COLOR_RE, BARE_COLOR_RE };
