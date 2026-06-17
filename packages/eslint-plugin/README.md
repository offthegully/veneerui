# eslint-plugin-veneer

The ESLint companion to [Veneer UI](https://www.npmjs.com/package/@offthegully/veneerui).
Rules that keep an app **themeable** after a token migration: they fail on the
ways a hardcoded *island* — a visual value no theme can reach — sneaks back in,
across the axes that fail **silently** (a baked shadow or off-scale spacing
doesn't render wrong, it just stops re-skinning).

| Rule | Flags | Fix |
|---|---|---|
| `veneer/no-hardcoded-colors` | `bg-blue-500`, `text-white`, `bg-[#fff]`, `[color:rgb(…)]`, inline `style={{ color: '#333' }}` | — |
| `veneer/no-baked-shadow` | named `shadow-md`, `inset-shadow-sm`, `text-shadow-glow` (geometry baked at build time) | ✅ → `[box-shadow:var(--shadow-md)]` |
| `veneer/no-island-spacing` | off-scale px: `p-[18px]`, `gap-[4px]` | ✅ → `p-4.5` |
| `veneer/no-dead-opacity` | `bg-opacity-75` (a Tailwind v4 no-op — renders opaque) | — |

The sanctioned escape hatch is always a **token reference** — a semantic utility
(`bg-primary`, `text-text-muted`, `border-border`) or `var(--token)` (e.g.
`[box-shadow:var(--shadow-card)]`, `drop-shadow-lg`) — none of which the rules
flag; `no-baked-shadow` and `no-island-spacing` autofix straight to that form.
They share the exact detector behind Veneer's
[conformance test](https://github.com/offthegully/veneerui/blob/main/apps/playground/src/conformance.test.ts),
so your editor, CI, and the design-system's own tests never disagree about what
counts as an island.

That escape hatch also covers **custom `color-x-*` colors** — the namespace an app
declares for shades the semantic tokens don't name. Consumed as `var()`
(`[color:var(--color-x-gold)]`, `bg-(--color-x-gold)`), they pass the rule like any
token. See the
[authoring guide](https://github.com/offthegully/veneerui/blob/main/docs/authoring-guide.md#4-custom-colors-beyond-the-schema-palette).

## Install

```sh
npm i -D eslint-plugin-veneer
```

## Use (flat config)

```js
// eslint.config.js
import veneer from 'eslint-plugin-veneer'

export default [
  veneer.configs.recommended,
]
```

Or wire the rules yourself:

```js
import veneer from 'eslint-plugin-veneer'

export default [
  {
    plugins: { veneer },
    rules: {
      'veneer/no-hardcoded-colors': 'error',
      'veneer/no-baked-shadow': 'error',
      'veneer/no-island-spacing': 'error',
      'veneer/no-dead-opacity': 'error',
    },
  },
]
```

Test files legitimately contain color/utility fixtures, so turn the rules off for them:

```js
{
  files: ['**/*.test.{ts,tsx}'],
  rules: {
    'veneer/no-hardcoded-colors': 'off',
    'veneer/no-baked-shadow': 'off',
    'veneer/no-island-spacing': 'off',
    'veneer/no-dead-opacity': 'off',
  },
}
```

## License

MIT
