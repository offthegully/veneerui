/**
 * veneer/no-hardcoded-colors
 *
 * Fails when a component hardcodes a color instead of routing it through a theme
 * token. Three shapes (see ./detect-hardcoded-colors.js):
 *   1. a Tailwind palette utility       — `bg-blue-500`, `text-white`
 *   2. an arbitrary color value         — `bg-[#fff]`, `[color:rgb(...)]`
 *   3. a bare color in an inline style  — `style={{ color: '#333' }}`
 *
 * This is what keeps the Phase-2 conversion from rotting: the next feature that
 * reaches for `bg-blue-500` fails CI instead of quietly adding an un-themed
 * island. The sanctioned escape hatch is a token reference — a semantic utility
 * or `var(--token)` — neither of which this rule flags.
 */
import { findClassColorViolations, findBareColorLiterals } from './detect-hardcoded-colors.js';

/** @type {import('eslint').Rule.RuleModule} */
export default {
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
