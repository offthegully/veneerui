# eslint-plugin-veneer

The ESLint companion to [Veneer UI](https://www.npmjs.com/package/@offthegully/veneerui).
One rule — `veneer/no-hardcoded-colors` — that keeps an app **themeable** after a
token migration: it fails on the three ways a hardcoded color sneaks back in.

```
1. a Tailwind palette utility       bg-blue-500, text-white
2. an arbitrary color value         bg-[#fff], [color:rgb(...)]
3. a bare color in an inline style  style={{ color: '#333' }}
```

The sanctioned escape hatch is a **token reference** — a semantic utility
(`bg-primary`, `text-text-muted`, `border-border`) or `var(--token)` — neither of
which the rule flags. It shares the exact detector behind Veneer's
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

Or wire the rule yourself:

```js
import veneer from 'eslint-plugin-veneer'

export default [
  {
    plugins: { veneer },
    rules: { 'veneer/no-hardcoded-colors': 'error' },
  },
]
```

Test files legitimately contain color fixtures, so turn the rule off for them:

```js
{ files: ['**/*.test.{ts,tsx}'], rules: { 'veneer/no-hardcoded-colors': 'off' } }
```

## License

MIT
