---
"eslint-plugin-veneer": minor
---

Add three rules that extend themeability enforcement beyond color to the axes that fail silently, and enable them in the `recommended` preset.

- **`no-baked-shadow`** — flags named `shadow-*` / `inset-shadow-*` / `text-shadow-*` utilities. Tailwind v4 bakes their geometry at build time, so re-setting `--shadow-*` at runtime can't re-skin them. **Autofixes** to the token escape hatch, e.g. `shadow-md` → `[box-shadow:var(--shadow-md)]`, `text-shadow-glow` → `[text-shadow:var(--text-shadow-glow)]`. Only the shadow tokens Veneer actually defines (per type) are matched, so the autofix can never point at a nonexistent token. `drop-shadow-*` (already themeable), `shadow-none`, and color shadows (`shadow-primary`) are left alone.
- **`no-island-spacing`** — flags off-scale **integer** px on the spacing scale (`p-[18px]`, `gap-[4px]`, `-mt-[8px]`), which won't rescale with the theme's `--spacing`. **Autofixes** to the decimal multiplier (`p-[18px]` → `p-4.5`). Non-px values (`w-[100vw]`, `max-w-[65ch]`) are left alone.
- **`no-dead-opacity`** — flags Tailwind v3 `*-opacity-N` utilities (`bg-opacity-75`), which are no-ops in v4 (the element renders opaque). Use the color slash syntax (`bg-primary/75`) or an opacity token.

All three scan only **class contexts** — `className`/`class` attributes and class-merge calls (`clsx`/`cn`/`classnames`/`cx`/`twMerge`, by bare or member name like `styles.cx(...)`) — so they catch lone classNames, `clsx('a', 'shadow-md')` args, the `clsx({ 'shadow-md': on })` object form, and `'a ' + 'shadow-md'` concatenation, while never flagging token-name strings (`tokenValue(t, 'shadow-card')`) or prose. They share the same detector as `no-hardcoded-colors` and the conformance test.

Known limitations (deliberate, to avoid false positives): `cva`/`tv` variant **config objects** (classes as nested object *values*) aren't scanned, and a class-merge helper imported under a renamed local name isn't recognized.

**Upgrade note:** projects extending `veneer/recommended` will see these as new `error`-level rules — existing lint may surface findings on first run. `no-baked-shadow` and `no-island-spacing` are autofixable (`eslint --fix`); `no-dead-opacity` is report-only.
