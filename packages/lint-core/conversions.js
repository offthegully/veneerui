/**
 * Structural token conversions — the AGENTS.md "looks right but breaks theming"
 * gotchas, encoded once. (Color islands live in ./detect.js; this file is the
 * NON-color half: shadows, border-width, duration, opacity, arbitrary sizes.)
 *
 * Each entry is `{ kind, deterministic, match, replace?, suggest? }`:
 *   - `match` is a global RegExp used by BOTH `veneerui doctor` (to count
 *     gotchas) and `veneerui migrate` (to find them).
 *   - `deterministic: true` rows carry a `replace(m, ...groups)` that rewrites
 *     the utility 1:1 to its themeable form; migrate applies these automatically.
 *   - `deterministic: false` rows carry a `suggest` string; migrate only FLAGS
 *     them (the right token is a judgment call — `opacity-disabled` vs
 *     `opacity-overlay`, which arbitrary size rounds to which scale step) and
 *     never guesses.
 *
 * Idempotency: every `match` requires a LEAD boundary (start/space/quote) before
 * the utility, so a converted form like `var(--shadow-md)` or `border-border`
 * — where the token name is preceded by `-` — is never re-matched. Running
 * migrate twice equals running it once.
 *
 * Plain JS for the same reason as ./detect.js (ESLint / Vitest / zero-dep CLI).
 */

// Start-of-string, whitespace, or a quote. Excludes `-` `(` `:` so converted
// output (which embeds token names after `--`/`:`) can't re-trigger a rule.
const LEAD = '(?:^|[\\s"\'`])';

/** shadow utilities whose geometry Tailwind v4 bakes at build time. */
const SHADOW = '(?:2xs|xs|sm|md|lg|xl|2xl|card|glow)';
const INSET_SHADOW = '(?:sm|md|lg)';
const TEXT_SHADOW = '(?:sm|md|lg|glow)';

export const CONVERSIONS = [
  {
    kind: 'box-shadow',
    deterministic: true,
    // `shadow-md` → `[box-shadow:var(--shadow-md)]`. (`drop-shadow-*` is the
    // documented exception — its utility resolves the var — so it's untouched.)
    match: new RegExp(`(${LEAD})(shadow-${SHADOW})\\b`, 'g'),
    replace: (_m, lead, util) => `${lead}[box-shadow:var(--${util})]`,
  },
  {
    kind: 'inset-box-shadow',
    deterministic: true,
    match: new RegExp(`(${LEAD})(inset-shadow-${INSET_SHADOW})\\b`, 'g'),
    replace: (_m, lead, util) => `${lead}[box-shadow:var(--${util})]`,
  },
  {
    kind: 'text-shadow',
    deterministic: true,
    match: new RegExp(`(${LEAD})(text-shadow-${TEXT_SHADOW})\\b`, 'g'),
    replace: (_m, lead, util) => `${lead}[text-shadow:var(--${util})]`,
  },
  {
    kind: 'border-width',
    deterministic: true,
    // Bare `border` (1px) or a fixed box-level numeric width (`border-2`) → the
    // themeable arbitrary width plus the semantic color utility. Sided
    // (`border-t`, `border-t-2`), colored (`border-primary`), and the
    // already-correct `border-border` are deliberately NOT matched: sided widths
    // need real CSS prop names (`border-top-width`) and a per-side judgment, so
    // they're left for manual conversion.
    match: new RegExp(`(${LEAD})border(?:-(?:0|2|4|8))?(?=$|[\\s"'\`])`, 'g'),
    replace: (_m, lead) => `${lead}[border-width:var(--border-width-default)] border-border`,
  },
  {
    kind: 'duration',
    deterministic: true,
    // Unitless ms durations bake at build time; the calc keeps them themeable.
    // Maps to the `default` token (per AGENTS.md) — the fast/slow distinction is
    // re-tunable in the theme, not worth a judgment prompt per call site.
    match: new RegExp(`(${LEAD})duration-\\d+\\b`, 'g'),
    replace: (_m, lead) => `${lead}duration-[calc(var(--duration-default)*1ms)]`,
  },
  {
    kind: 'opacity',
    deterministic: false,
    // `opacity-50` could mean the disabled state or an overlay scrim — different
    // tokens. Flag, don't guess.
    match: new RegExp(`(${LEAD})opacity-\\d+\\b`, 'g'),
    suggest: 'opacity-(--opacity-disabled) or opacity-(--opacity-overlay)',
  },
  {
    kind: 'arbitrary-size',
    deterministic: false,
    // `text-[15px]`, `rounded-[22px]` → the nearest scale step (`text-sm`,
    // `rounded-2xl`). Limited to the prefixes that HAVE a discrete token scale
    // (type size, radius, leading, tracking) — arbitrary layout dimensions like
    // `w-[600px]` have no token to convert to, so flagging them would be noise.
    // The nearest step is a judgment call (it changes the rendered size), so flag
    // rather than silently round. `var(...)` values are excluded.
    match: new RegExp(`(${LEAD})(?:text|rounded|leading|tracking)-\\[[\\d.]+(?:px|rem|em)?\\]`, 'g'),
    suggest: 'the nearest scale-step utility (e.g. text-sm, rounded-2xl)',
  },
];

/** Just the auto-appliable rows, in apply order. */
export const DETERMINISTIC = CONVERSIONS.filter((c) => c.deterministic);

/**
 * Apply every deterministic conversion to a class-bearing source string.
 * Returns `{ output, applied }` where `applied` lists each rewrite made.
 * Pure and idempotent.
 */
export function applyDeterministic(text) {
  let output = text;
  const applied = [];
  for (const c of DETERMINISTIC) {
    output = output.replace(c.match, (...args) => {
      // args = [match, ...groups, offset, string]
      const match = args[0];
      const groups = args.slice(1, -2);
      applied.push({ kind: c.kind, from: match.trim() });
      return c.replace(match, ...groups);
    });
  }
  return { output, applied };
}

/**
 * Find judgment-call gotchas (the non-deterministic rows) in a source string.
 * Returns `[{ kind, value, index, suggest }]` — what migrate flags for a human.
 */
export function findJudgmentCalls(text) {
  const out = [];
  for (const c of CONVERSIONS) {
    if (c.deterministic) continue;
    c.match.lastIndex = 0;
    let m;
    while ((m = c.match.exec(text)) !== null) {
      out.push({ kind: c.kind, value: m[0].trim(), index: m.index, suggest: c.suggest });
      if (m.index === c.match.lastIndex) c.match.lastIndex++;
    }
  }
  return out;
}

/**
 * Find every gotcha instance (deterministic + judgment) in a source string —
 * used by `veneerui doctor` to list and size un-themed structural islands.
 * Returns `[{ kind, value, index, deterministic, suggest }]`. Pure.
 */
export function findConversions(text) {
  const out = [];
  for (const c of CONVERSIONS) {
    c.match.lastIndex = 0;
    let m;
    while ((m = c.match.exec(text)) !== null) {
      out.push({
        kind: c.kind,
        value: m[0].trim(),
        index: m.index,
        deterministic: c.deterministic,
        suggest: c.suggest,
      });
      if (m.index === c.match.lastIndex) c.match.lastIndex++;
    }
  }
  return out;
}

/**
 * Count every gotcha (deterministic + judgment) by kind — used by
 * `veneerui doctor` to size the migration. Pure; does not mutate input.
 */
export function countConversions(text) {
  const counts = {};
  for (const c of CONVERSIONS) {
    c.match.lastIndex = 0;
    let n = 0;
    let m;
    while ((m = c.match.exec(text)) !== null) {
      n++;
      if (m.index === c.match.lastIndex) c.match.lastIndex++;
    }
    if (n) counts[c.kind] = n;
  }
  return counts;
}
