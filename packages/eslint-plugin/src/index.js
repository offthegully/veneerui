/**
 * eslint-plugin-veneer
 *
 * One rule, `veneer/no-hardcoded-colors`, that keeps an app themeable after a
 * Veneer migration: it fails on the three ways a hardcoded color sneaks in —
 *   1. a Tailwind palette utility       — `bg-blue-500`, `text-white`
 *   2. an arbitrary color value         — `bg-[#fff]`, `[color:rgb(...)]`
 *   3. a bare color in an inline style  — `style={{ color: '#333' }}`
 * The sanctioned escape hatch is a token reference (a semantic utility or
 * `var(--token)`), neither of which this flags.
 *
 * The matching logic is `@veneerui/lint-core` — the SAME detector behind the
 * conformance test — so the editor, CI, and the design-system's own tests can
 * never disagree about what counts as an island.
 */
import { findClassColorViolations, findBareColorLiterals } from '@veneerui/lint-core/detect';

/** @type {import('eslint').Rule.RuleModule} */
const noHardcodedColors = {
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
      Literal(node) {
        if (typeof node.value !== 'string') return;
        for (const v of findClassColorViolations(node.value)) report(node, v);
      },
      TemplateLiteral(node) {
        for (const q of node.quasis) {
          for (const v of findClassColorViolations(q.value.cooked ?? q.value.raw)) report(q, v);
        }
      },
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

const plugin = {
  meta: { name: 'eslint-plugin-veneer', version: '0.1.0' },
  rules: { 'no-hardcoded-colors': noHardcodedColors },
};

// Flat-config preset: `import veneer from 'eslint-plugin-veneer'` then spread
// `veneer.configs.recommended` into your config array.
plugin.configs = {
  recommended: {
    name: 'veneer/recommended',
    plugins: { veneer: plugin },
    rules: { 'veneer/no-hardcoded-colors': 'error' },
  },
};

export default plugin;
export { noHardcodedColors };
