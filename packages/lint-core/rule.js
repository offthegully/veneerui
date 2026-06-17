/**
 * The Veneer rule bodies — the single source shared by eslint-plugin-veneer
 * (which tsup bundles into the published artifact) and the playground's own
 * ESLint config, so there's exactly one definition of each.
 *
 * `no-hardcoded-colors` fails on the three ways a hardcoded color sneaks in:
 *   1. a Tailwind palette utility       — `bg-blue-500`, `text-white`
 *   2. an arbitrary color value         — `bg-[#fff]`, `[color:rgb(...)]`
 *   3. a bare color in an inline style  — `style={{ color: '#333' }}`
 *
 * Three more rules cover the non-color axes that fail *silently* (AGENTS.md
 * §3/§9) — they don't render wrong, they just stop being themeable:
 *   • `no-baked-shadow`   — named `shadow-*`/`text-shadow-*` bake their geometry
 *   • `no-island-spacing` — `p-[18px]` won't rescale with `--spacing`
 *   • `no-dead-opacity`   — `bg-opacity-N` is a v4 no-op (renders opaque)
 *
 * The sanctioned escape hatch is always a token reference (a semantic utility or
 * `var(--token)`), which none of these flag. The detector is `./detect.js`, the
 * SAME matcher the conformance test uses, so the editor, CI, and the design
 * system's own tests can never disagree about what counts as an island.
 */
import {
  findClassColorViolations,
  findBareColorLiterals,
  findBakedShadows,
  findIslandSpacing,
  findDeadOpacity,
} from './detect.js';

/** @type {import('eslint').Rule.RuleModule} */
export const noHardcodedColors = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow hardcoded colors; require theme token utilities or var(--token) so every surface is themeable.',
    },
    schema: [],
    messages: {
      'palette-utility':
        'Hardcoded palette color "{{value}}" — use a theme token utility (e.g. bg-primary, text-text-muted) so the theme can re-skin it.',
      'arbitrary-color':
        'Arbitrary color value "{{value}}" — reference a theme token instead (a semantic utility or var(--token)).',
      'inline-color':
        'Hardcoded color "{{value}}" in an inline style — drive it from a theme token (a className utility or var(--token)).',
    },
  },

  create(context) {
    const report = (node, { kind, value }) =>
      context.report({ node, messageId: kind, data: { value } });

    /** Walk a `style={{ … }}` object for string-valued properties. */
    const checkStyleValue = (valueNode) => {
      if (!valueNode) return;
      if (valueNode.type === 'Literal' && typeof valueNode.value === 'string') {
        for (const v of findBareColorLiterals(valueNode.value)) report(valueNode, v);
      } else if (valueNode.type === 'TemplateLiteral') {
        for (const q of valueNode.quasis) {
          for (const v of findBareColorLiterals(q.value.cooked ?? q.value.raw)) report(q, v);
        }
      }
    };

    return {
      // Class-string patterns: safe to scan on every string/template literal —
      // they can't match token utilities, schema hex, or test fixtures.
      Literal(node) {
        if (typeof node.value !== 'string') return;
        for (const v of findClassColorViolations(node.value)) report(node, v);
      },
      TemplateLiteral(node) {
        for (const q of node.quasis) {
          for (const v of findClassColorViolations(q.value.cooked ?? q.value.raw)) report(q, v);
        }
      },

      // Inline styles carry raw CSS, so bare hex / color-fn literals matter here.
      'JSXAttribute[name.name="style"]'(node) {
        const value = node.value;
        if (value?.type !== 'JSXExpressionContainer') return;
        const expr = value.expression;
        if (expr?.type !== 'ObjectExpression') return;
        for (const prop of expr.properties) {
          if (prop.type === 'Property') checkStyleValue(prop.value);
        }
      },
    };
  },
};

/**
 * Callee names whose arguments are class strings. A `clsx`/`cn`/… arg is
 * unambiguously classes (so `clsx('shadow-md')` is flagged), while a same-named
 * string elsewhere — `tokenValue(t, 'shadow-card')`, a prose literal — is not a
 * call to one of these, so it's never scanned. That class-context gating is what
 * lets the island finders skip the lone-token / prose guesswork entirely.
 *
 * These are the *string/object merge* helpers (classes are positional string
 * args or object keys). `cva`/`tv` are deliberately excluded: their classes live
 * as nested object *values* in a variant config, a different shape `collect()`
 * doesn't model — listing them here would advertise coverage we don't deliver.
 */
const CLASS_CALLEES = new Set([
  'clsx', 'cn', 'classnames', 'classNames', 'cx', 'twMerge', 'twJoin', 'tw',
]);

/**
 * Builds a rule that scans *class-context* strings with one of the island
 * finders and reports each hit, with an autofix when the finder supplied a `fix`.
 *
 * Class contexts are `className`/`class` JSX attributes and the arguments of the
 * class-merge calls above — never every string literal. This is what fixes the
 * mirror-image bugs of a blanket scan: a lone `className="shadow-md"` or a
 * `clsx(...)` arg IS caught, while prose / token-name strings are NOT.
 *
 * Autofix is applied to plain string `Literal`s only. Template-literal quasis are
 * reported but not auto-fixed: mapping a cooked offset back to raw source is
 * escape-sensitive, and the message already names the replacement.
 */
function createClassRule({ find, description, messages, fixable }) {
  return {
    meta: {
      type: 'problem',
      ...(fixable ? { fixable: 'code' } : {}),
      schema: [],
      docs: { description },
      messages,
    },
    create(context) {
      const sourceCode = context.sourceCode ?? context.getSourceCode();

      // Report each island in `text`; contentStart is the source offset of the
      // text's first char, or null when offsets can't be mapped (template quasi).
      const report = (node, text, contentStart) => {
        for (const v of find(text)) {
          const canFix = fixable && v.fix != null && contentStart != null;
          context.report({
            node,
            messageId: v.kind,
            data: { value: v.value, fix: v.fix ?? '' },
            fix: canFix
              ? (fixer) => {
                  const start = contentStart + v.index;
                  const end = start + v.value.length;
                  // Verify the source really holds the matched text at this range
                  // (guards against escape / cooked-vs-raw drift) before editing.
                  if (sourceCode.getText().slice(start, end) !== v.value) return null;
                  return fixer.replaceTextRange([start, end], v.fix);
                }
              : undefined,
          });
        }
      };

      // Collect class-string leaves from an expression used as classes: plain
      // strings, template quasis, `'a ' + x` concatenation, the operands of
      // `?:` / `&&`, arrays, and the *keys* of an object (the `clsx({ 'p-2': on })`
      // form, where the key is the class). Call expressions are NOT recursed —
      // class-merge calls are handled by the CallExpression visitor (no double
      // scan), and other calls aren't class strings.
      const collect = (expr) => {
        if (!expr) return;
        switch (expr.type) {
          case 'Literal':
            if (typeof expr.value === 'string') report(expr, expr.value, expr.range[0] + 1);
            break;
          case 'TemplateLiteral':
            for (const q of expr.quasis) report(q, q.value.cooked ?? q.value.raw, null);
            break;
          case 'BinaryExpression':
            if (expr.operator === '+') {
              collect(expr.left);
              collect(expr.right);
            }
            break;
          case 'ConditionalExpression':
            collect(expr.consequent);
            collect(expr.alternate);
            break;
          case 'LogicalExpression':
            collect(expr.left);
            collect(expr.right);
            break;
          case 'ArrayExpression':
            for (const el of expr.elements) collect(el);
            break;
          case 'ObjectExpression':
            // `clsx`/`cn`/`cx` object form: the (string-literal) key is the class.
            for (const prop of expr.properties) {
              const key = prop.type === 'Property' && !prop.computed ? prop.key : null;
              if (key && key.type === 'Literal' && typeof key.value === 'string') {
                report(key, key.value, key.range[0] + 1);
              }
            }
            break;
          default:
            break;
        }
      };

      return {
        // `className="…"` / `className={…}` (string, template, conditional, …) —
        // except a class-merge call value, which the CallExpression visitor takes.
        JSXAttribute(node) {
          const name = node.name?.name;
          if (name !== 'className' && name !== 'class') return;
          const value = node.value;
          if (!value) return;
          if (value.type === 'Literal') {
            collect(value);
          } else if (value.type === 'JSXExpressionContainer') {
            const expr = value.expression;
            if (expr && expr.type === 'CallExpression') return; // handled below
            collect(expr);
          }
        },
        // clsx('a', cond && 'shadow-md'), cn(...), utils.cx(...) anywhere —
        // including assigned to a const, so hoisted class helpers are covered.
        // Matches a bare callee (`cn(...)`) or a member callee by property name
        // (`styles.cx(...)`); an import renamed to an unlisted local name is a
        // known, accepted limitation (would need import resolution).
        CallExpression(node) {
          const callee = node.callee;
          const name =
            callee?.type === 'Identifier'
              ? callee.name
              : callee?.type === 'MemberExpression' && callee.property?.type === 'Identifier'
                ? callee.property.name
                : null;
          if (!name || !CLASS_CALLEES.has(name)) return;
          for (const arg of node.arguments) collect(arg);
        },
      };
    },
  };
}

export const noBakedShadow = createClassRule({
  find: findBakedShadows,
  fixable: true,
  description:
    'Disallow named shadow utilities (they bake geometry at build time); use the [box-shadow:var(--token)] escape hatch so a theme can re-skin elevation.',
  messages: {
    'baked-shadow':
      'Named shadow "{{value}}" bakes its geometry at build time, so a theme can\'t re-skin it — use the token escape hatch {{fix}} instead.',
  },
});

export const noIslandSpacing = createClassRule({
  find: findIslandSpacing,
  fixable: true,
  description:
    'Disallow off-scale px on spacing utilities; use the decimal multiplier (p-4.5) so spacing rescales with the theme\'s --spacing.',
  messages: {
    'island-spacing':
      'Off-scale px spacing "{{value}}" won\'t rescale with the theme\'s --spacing — use the decimal multiplier {{fix}} instead.',
  },
});

export const noDeadOpacity = createClassRule({
  find: findDeadOpacity,
  fixable: false,
  description:
    'Disallow Tailwind v3 *-opacity-N utilities, which are dead in v4 (they render opaque); use the color slash syntax or an opacity token.',
  messages: {
    'dead-opacity':
      '"{{value}}" is dead in Tailwind v4 (the element renders fully opaque) — use the color slash syntax (e.g. bg-primary/75) or the opacity-(--opacity-*) token.',
  },
});

export default noHardcodedColors;
