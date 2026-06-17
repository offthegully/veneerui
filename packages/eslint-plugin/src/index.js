/**
 * eslint-plugin-veneer
 *
 * Rules that keep an app themeable — they fail on the ways a hardcoded *island*
 * (a visual value no theme can reach) sneaks in, across the axes that fail
 * silently:
 *   • no-hardcoded-colors — palette utility (`bg-blue-500`), arbitrary color
 *     (`bg-[#fff]`), or a bare inline-style color (`style={{ color: '#333' }}`)
 *   • no-baked-shadow     — named `shadow-*`/`text-shadow-*` (bake geometry at
 *     build time, so a theme can't re-skin elevation)
 *   • no-island-spacing   — `p-[18px]`-style px that won't rescale with --spacing
 *   • no-dead-opacity     — `bg-opacity-N`, a Tailwind v4 no-op (renders opaque)
 *
 * The sanctioned escape hatch is always a token reference (a semantic utility or
 * `var(--token)`), which none of these flag; the shadow/spacing rules autofix to
 * exactly that form.
 *
 * The rule bodies and their detector live in `@veneerui/lint-core` — the SAME
 * code behind the conformance test and the playground's own lint — so the
 * editor, CI, and the design system's own tests can never disagree about what
 * counts as an island. tsup bundles lint-core into the published artifact (see
 * tsup.config.ts), so a consumer installs just this one package.
 */
import {
  noHardcodedColors,
  noBakedShadow,
  noIslandSpacing,
  noDeadOpacity,
} from '@veneerui/lint-core/rule';

const rules = {
  'no-hardcoded-colors': noHardcodedColors,
  'no-baked-shadow': noBakedShadow,
  'no-island-spacing': noIslandSpacing,
  'no-dead-opacity': noDeadOpacity,
};

const plugin = {
  // No `version` here on purpose — a hand-kept string drifts from package.json;
  // ESLint doesn't require it.
  meta: { name: 'eslint-plugin-veneer' },
  rules,
};

// Flat-config preset: `import veneer from 'eslint-plugin-veneer'` then spread
// `veneer.configs.recommended` into your config array.
plugin.configs = {
  recommended: {
    name: 'veneer/recommended',
    plugins: { veneer: plugin },
    rules: {
      'veneer/no-hardcoded-colors': 'error',
      'veneer/no-baked-shadow': 'error',
      'veneer/no-island-spacing': 'error',
      'veneer/no-dead-opacity': 'error',
    },
  },
};

export default plugin;
export { noHardcodedColors, noBakedShadow, noIslandSpacing, noDeadOpacity };
