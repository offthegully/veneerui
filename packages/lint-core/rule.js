/**
 * The `veneer/no-hardcoded-colors` rule body — the single source shared by
 * eslint-plugin-veneer (which tsup bundles into the published artifact) and the
 * playground's own ESLint config, so there's exactly one rule definition. It
 * fails on the three ways a hardcoded color sneaks in:
 *   1. a Tailwind palette utility       — `bg-blue-500`, `text-white`
 *   2. an arbitrary color value         — `bg-[#fff]`, `[color:rgb(...)]`
 *   3. a bare color in an inline style  — `style={{ color: '#333' }}`
 * The sanctioned escape hatch is a token reference (a semantic utility or
 * `var(--token)`), neither of which this flags. The detector is `./detect.js`,
 * the SAME matcher the conformance test uses, so the editor, CI, and the design
 * system's own tests can never disagree about what counts as an island.
 */
import { findClassColorViolations, findBareColorLiterals } from './detect.js';

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

export default noHardcodedColors;
