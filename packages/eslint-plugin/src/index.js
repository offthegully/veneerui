/**
 * eslint-plugin-veneer
 *
 * One rule, `veneer/no-hardcoded-colors`, that keeps an app themeable: it fails
 * on the three ways a hardcoded color sneaks in — a Tailwind palette utility
 * (`bg-blue-500`), an arbitrary color value (`bg-[#fff]`), or a bare color in an
 * inline style (`style={{ color: '#333' }}`). The sanctioned escape hatch is a
 * token reference (a semantic utility or `var(--token)`), neither of which this
 * flags.
 *
 * The rule body and its detector live in `@veneerui/lint-core` — the SAME code
 * behind the conformance test and the playground's own lint — so the editor, CI,
 * and the design system's own tests can never disagree about what counts as an
 * island. tsup bundles lint-core into the published artifact (see
 * tsup.config.ts), so a consumer installs just this one package.
 */
import { noHardcodedColors } from '@veneerui/lint-core/rule';

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
