# Proposal: custom themeable colors (open palette namespace) — v2

**Status:** draft / for review (v2 — incorporates the v1 code-verification review)
**Scope:** `@offthegully/veneerui` (validator, **runtime apply**, **provider fallback**, schema-gen, docs)
**Author:** (drafted via Claude Code, 2026-06-03; revised 2026-06-03 after verifying every claim against the code)

## What changed from v1 (and why)

A line-by-line verification pass against the actual code invalidated v1's two
load-bearing claims. The corrections below are the reason this is v2, not an edit:

1. **"The runtime already applies any token name generically" was false.** The
   steady-state React runtime (`apply.ts:21`) iterates the **closed**
   `TOKEN_SCHEMA`, not the theme's own tokens — so it silently drops any
   `color-x-*` key. Only the pre-hydration `anti-flash.ts:89` is generic. v1's §3
   ("Runtime — already done, no change to apply.ts") was wrong, and the Touchpoints
   table omitted the single most important change. **`apply.ts` must change**;
   this is a small pipeline change, not a one-branch change. (See §3.)
2. **"Re-skins on theme switch for free" was false.** Theme switching routes only
   through `applyTheme` (`ThemeProvider.tsx:110`), whose set *and* remove branches
   are both schema-scoped (`apply.ts:23–24`). Without the §3 fix, a custom color is
   never updated or cleared on switch — it freezes at the first-painted value or
   leaks across themes.
3. **The §6 fallback anchor (`DEFAULT_THEME_ID`) protected nothing.**
   `DEFAULT_THEME_ID` = `'default-light'` (`builtin/index.ts:35`), a Veneer baseline
   with ~3 tokens and zero app palette. App custom colors live in the app's own
   theme. The fallback must anchor on the **app's base theme**
   (`themes.find(t => t.id === defaultThemeId)`), which the provider already
   resolves. (See §6.)
4. **The lint touchpoint was a no-op.** `packages/lint-core/detect.js` is a pure
   literal-color blocklist; it never inspects names inside `var(...)` and never
   consults a reserved-token list. `var(--color-x-*)` **already passes lint and the
   conformance test today, with zero changes.** The reserved-token list is consumed
   only by `veneerui doctor` (shadcn-collision warnings). Dropped from Touchpoints;
   downgraded to an optional doctor advisory. (See §4, §7.)
5. **A consumption example was a silent-failure bug.** `text-(--color-x-bronze)` is
   the Tailwind v4 *ambiguous-variable* case (`text-` is both font-size and color),
   so it won't compile to a color — and the lint rule won't catch it. Replaced with
   the repo's house style `[color:var(--color-x-bronze)]`. (See §4.)
6. **New value gate: reject `var()` inside custom color values.** Custom colors are
   the first feature that invites `var()` chaining, and Node/CI (`matchProperty`)
   and the browser (`CSS.supports`) disagree on whether `var()` is valid — and
   localStorage themes aren't re-validated on apply. v1's value validation was
   otherwise correct but didn't close this skew. (See §2, Security.)
7. **Schema regex must equal the validator regex.** v1's schema pattern was *looser*
   than the validator (the wrong direction — editors would green-light names the
   validator silently drops). Both now emit from one shared constant. (See §7.)

The motivation, the reserved-namespace idea, the reuse of `hasDangerousPattern` +
`checkValue(_, 'color')`, and routing consumption through `var()` all survived the
review unchanged — they are the strongest parts.

## Problem

Veneer's color vocabulary is a **closed set** — `primary`, `accent`, the four
status colors, surfaces, text, borders. An app that needs a color outside that set
(medal gold/silver/bronze, a brand secondary, a category palette, a chart series)
has only two options today, and both are bad:

1. **Hardcode it** — `text-[#cd7f32]`. Works, but it's an island: no theme can
   re-skin it, and it fails the `no-hardcoded-colors` gate. (Real example today:
   `components/leaderboard/LeaderboardView.tsx` in the photoguessr app.)
2. **Abuse a semantic token** — reuse `accent` or `warning` for "gold". Themeable,
   but semantically wrong and collides the moment the app needs two extra colors.

The goal: let apps define **arbitrary named colors that remain fully themeable** —
real CSS-variable tokens that every theme can override — without reopening the
hardcoded-color hole.

## How theming actually works today (corrected)

Understanding the real pipeline is what v1 got wrong, so state it precisely. Three
mechanisms carry a token value to the screen, and the "any theme skins any UI"
guarantee depends on all three:

- **The CSS floor.** `scripts/generate-theme.ts` emits a `:root`/`@theme` default
  for *every* schema token into `packages/theme/tokens.generated.css`. This is the
  floor that makes a sparse theme work — anything it omits falls through to here.
- **The steady-state runtime.** `applyTheme` (`apply.ts:19–25`) iterates
  `TOKEN_SCHEMA` and, for each schema token, **sets** the theme's value as an inline
  custom property on `<html>` or **removes** it (letting the floor take over). It
  iterates the *schema*, not the theme's keys — that's deliberate: it's how
  switching from a heavy theme back to a sparse one clears leftovers (`apply.ts:6–9`).
- **The anti-flash script.** `anti-flash.ts:89` runs before hydration and is the one
  genuinely generic writer: `for (var k in tokens) s.setProperty('--'+k, tokens[k])`.
  It paints whatever keys the saved/default theme contains.

The validator (`validate.ts`) is the security boundary: it drops unknown token names
(`validate.ts:86`) and value-checks known ones. The runtime `applyTheme` is a
**second** closed gate that v1 missed — even a token that survives validation is
ignored at apply time unless its name is in `TOKEN_SCHEMA`.

So enabling custom colors requires opening **two** gates (the validator *and*
`applyTheme`) plus one fallback merge — still small, but not "one branch."

## Design

### 1. Reserved namespace
Custom colors live under a reserved prefix so they can never collide with current or
future schema tokens: **`color-x-<slug>`** (`x` = "extra"), slug = `[a-z0-9-]+`.
Examples: `color-x-gold`, `color-x-bronze`, `color-x-chart-1`.

> **Why keep the `color-` prefix.** Not for "color-type tooling" (no Veneer code
> keys off the name prefix — `checkValue` takes the type as an explicit argument,
> coverage/value-check bucket by `tokenDef.type`). The real reason is **Tailwind
> v4's `@theme` color namespace**: only variables under `--color-*` generate color
> utilities like `bg-x-gold` (§5). That mechanism *requires* the `color-` prefix.
> Alternatives (`palette-*`, `brand-*`) would forfeit it. (Open Q1.)

### 2. Validator rule (gate 1 of 2)
In `validateTheme` (`validate.ts`), the unknown-token drop at line 86 stays, but a
custom-namespace branch runs first. Declare the counter before the loop:

```ts
let customCount = 0;
for (const [key, raw] of Object.entries(obj.tokens as Record<string, unknown>)) {
  const tokenDef = TOKEN_BY_NAME.get(key);
  if (!tokenDef) {
    if (!key.startsWith('color-x-')) continue;          // truly-unknown keys: silent drop (as today)
    if (!CUSTOM_COLOR_RE.test(key)) {                   // looks custom but malformed → surface it
      fail(`tokens.${key}`, `Malformed custom color name (expected ${CUSTOM_COLOR_RE})`);
      continue;
    }
    if (typeof raw !== 'string') { fail(`tokens.${key}`, 'Value must be a string'); continue; }
    const value = raw.trim();
    if (hasDangerousPattern(value)) { fail(`tokens.${key}`, `Forbidden pattern: ${JSON.stringify(value)}`); continue; }
    if (/var\s*\(/i.test(value)) { fail(`tokens.${key}`, 'Custom colors may not use var() (v1)'); continue; }
    if (!checkValue(value, 'color')) { fail(`tokens.${key}`, `Invalid color: ${JSON.stringify(value)}`); continue; }
    if (customCount >= MAX_CUSTOM_COLORS) {             // anti-DoS cap on the untrusted import path
      fail(`tokens.${key}`, `Too many custom colors (max ${MAX_CUSTOM_COLORS})`);
      continue;
    }
    cleaned[key] = value; customCount++;
    continue;
  }
  // ...existing known-token path unchanged (validate.ts:87–104)
}
```

Notes vs the real code (verified):
- `cleaned`, `key`, `raw`, and `fail(path, message)` are the actual names in
  `validateTheme` (`validate.ts:66, 83, 84`). `checkValue` is an in-scope parameter
  (`validate.ts:64`) — no import needed. The branch ends in its own `continue`, so it
  never falls through to the known-token path.
- The required-token loop (`validate.ts:107–111`) iterates only `TOKEN_SCHEMA`, so a
  custom color can never be flagged "required." No change there.
- **Failure-mode choice (corrected from v1):** a `color-x-`-prefixed key that fails
  the slug regex now **fails loudly** (a typo like `color-x-Gold` is a debugging
  trap if silently dropped). Only genuinely non-`color-x-` keys keep the silent drop.
- `CUSTOM_COLOR_RE = /^color-x-[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/`
- `MAX_CUSTOM_COLORS` — see Security for threat model and number.

Because `validateTheme` runs on the **import/contribution** path (builtin themes
bypass it), this cap and these checks naturally apply to *untrusted* themes only.

### 3. Runtime — `applyTheme` must change (gate 2 of 2) — THE KEY CHANGE
`applyTheme` (`apply.ts`) currently can't see custom colors because it iterates the
schema. Extend it to (a) **clear** any stale `--color-x-*` from the previous theme,
then (b) **set** the active theme's custom colors:

```ts
export function applyTheme(theme: Theme, root = document.documentElement): void {
  const { style } = root;
  for (const { name } of TOKEN_SCHEMA) {                 // unchanged: schema tokens
    const value = theme.tokens[name];
    if (value != null) style.setProperty(`--${name}`, value);
    else style.removeProperty(`--${name}`);
  }
  // Open custom-color namespace: read what's currently set, clear stale, set current.
  for (let i = style.length - 1; i >= 0; i--) {
    const prop = style[i];                               // e.g. "--color-x-gold"
    if (prop.startsWith('--color-x-') && theme.tokens[prop.slice(2)] == null) {
      style.removeProperty(prop);                        // not in the new theme → clear (fixes the leak)
    }
  }
  for (const [key, value] of Object.entries(theme.tokens)) {
    if (key.startsWith('color-x-') && value != null) style.setProperty(`--${key}`, value);
  }
}
```

This mirrors the schema loop's set-or-clear contract for the open namespace, reading
the live inline custom properties to know what to clear (the schema can't enumerate
an open namespace). It is what makes custom colors actually paint *and* re-skin on
switch.

**`anti-flash.ts` needs no change:** `anti-flash.ts:89` already iterates the theme's
own keys generically, so it paints `--color-x-*` on first load for free. After this
`apply.ts` change the two paths apply the same set of properties, honoring the
documented "keep the two in sync" invariant (`apply.ts:13–14`, `anti-flash.ts:8–10`).
(anti-flash only ever *sets* on a fresh page, which is correct — clearing on switch
is `applyTheme`'s job, now handled.)

### 4. Consumption — sanctioned escape hatch, no literal
Use the repo's house style — the `var()` form Veneer already blesses:

```tsx
[color:var(--color-x-bronze)]    bg-(--color-x-gold)    [background-color:var(--color-x-gold)]
```

- This is **themeable** (a per-theme CSS variable) and **passes
  `no-hardcoded-colors`**: `detect.js`'s `ARBITRARY_COLOR_RE` matches only
  `#hex`/color-function literals, and `var(...)` is the deliberately-allowed escape
  hatch (`detect.js:44–49`). Verified empirically: `[color:var(--anything)]` passes
  the rule and the conformance test today, **no rule change required.**
- **Do not write `text-(--color-x-bronze)`.** In Tailwind v4 `text-` is ambiguous
  (font-size or color), so the bare-variable shorthand won't produce a color — and
  the lint rule won't flag it (silent failure into CI). Every parenthesis-shorthand
  in this repo carries a type hint (e.g. `bg-(image:--gradient-primary)` in
  `ThemeShowcase.tsx`). If you want the shorthand for text color, it **must** be
  `text-(color:--color-x-bronze)`. `bg-(--color-x-gold)` is fine (unambiguous).
- **Recommend an inline fallback** at the consumption site so a theme that omits the
  color degrades gracefully instead of rendering the CSS initial value
  (transparent/black): `[color:var(--color-x-bronze,currentColor)]`.

### 5. Utilities (optional, app-side)
Tailwind builds `bg-*` utilities at *build* time, so a name only known at *runtime*
cannot get a generated `bg-x-gold`. Two supported levels:

- **var-only (zero config):** `bg-(--color-x-gold)` / `[color:var(--color-x-gold)]`.
  Any name, no build step.
- **app-registered utilities:** the app declares the names it uses in its own
  `@theme` block (e.g. photoguessr `app/globals.css`):
  ```css
  @theme { --color-x-gold: #d4af37; --color-x-bronze: #cd7f32; }
  ```
  Tailwind then generates `bg-x-gold` / `text-x-gold` that compile to
  `var(--color-x-gold)` (verified: Veneer's own `bg-primary` compiles to
  `var(--color-primary)`), so a runtime override of `--color-x-gold` on `<html>`
  recolors them. The `@theme` line is the build-time default / utility registration;
  themes recolor the value.

> **Footgun to document:** the two levels have *different* missing-value behavior. A
> var-only `[color:var(--color-x-gold)]` with no fallback renders transparent/black
> when undefined (visibly broken — good). An `@theme`-registered `bg-x-gold` renders
> the **build-time hex** when a theme omits the token (invisibly wrong). If you use
> the `@theme` path, make that hex equal the app base theme's value, and remember
> the hex lives in app CSS where `no-hardcoded-colors` can't (and shouldn't) see it.

### 6. The "any theme skins any UI" guarantee — anchor on the APP base theme
Custom colors threaten the guarantee: a theme that never defined `color-x-gold`
leaves it undefined → broken UI. v1's fix merged from `DEFAULT_THEME_ID`, which is
wrong: that's Veneer's builtin `default-light` (~3 tokens), which never contains an
app's palette.

**Corrected fix:** merge custom colors from the **app's base theme** — the entry the
provider already resolves from its own props. In `ThemeProvider`, between computing
`applied` (`ThemeProvider.tsx:108`) and the `applyTheme` call (`:110`):

```ts
const baseTheme = useMemo(
  () => themes.find((t) => t.id === defaultThemeId),   // app-owned base; props already in scope
  [themes, defaultThemeId],
);

function withCustomFallback(theme: Theme, base?: Theme): Theme {
  if (!base || base.id === theme.id) return theme;
  const tokens = { ...theme.tokens };
  for (const [k, v] of Object.entries(base.tokens)) {
    if (k.startsWith('color-x-') && tokens[k] == null) tokens[k] = v;   // base ∪ active, active wins
  }
  return { ...theme, tokens };
}

const applied = withCustomFallback(preview ?? current, baseTheme);
useLayoutEffect(() => { if (applied) applyTheme(applied); }, [applied]);
```

Net effect: the **app's base theme declares the custom palette**; other themes *may*
recolor it; none can *break* it. The merge set is `base customs ∪ active customs` so
switching away from a theme's own custom color clears it (via §3) and falls back to
the base value.

> **Caveat the provider merge can't fully fix.** The base-theme merge only patches
> the inline-style path on `<html>`. It does *not* create a stylesheet `@theme` floor
> (custom colors aren't in `TOKEN_SCHEMA`, so `tokens.generated.css` emits none). For
> a floor that also backs `@theme`-registered utilities, the app should declare its
> palette in its own `@theme` (§5) and/or use inline `var(... , fallback)` (§4). The
> merge handles the common case; these handle the edges.

> **JS read-path decision (Open Q6).** `tokenValue(theme, 'color-x-gold')`
> (`token-value.ts:6`) returns `''` for an undefined custom color (neither the
> theme nor the schema default map has it). The §6 merge fixes the *DOM* path, not
> the JS read path. Decide one of: (a) expose the merged theme as context `current`
> so both paths see the fallback; (b) teach `tokenValue` an optional base arg; or
> (c) steer components to the `var()`/utility path (§4) for custom colors and treat
> `tokenValue` for `color-x-*` as unsupported in v1. Leaning (c) for v1 simplicity.

### 7. JSON Schema (autocomplete) + docs
- `scripts/generate-theme.ts` builds `tokens` as `{ type:'object',
  additionalProperties:false, required: requiredTokens, properties: tokenProps }`
  (verified ~line 88). Add `patternProperties` keyed by the **same** regex the
  validator uses (no looser duplicate):
  ```ts
  tokens: {
    type: 'object',
    additionalProperties: false,
    required: requiredTokens,
    properties: tokenProps,
    patternProperties: { [CUSTOM_COLOR_RE.source]: { type: 'string' } },
  }
  ```
  `additionalProperties:false` + `patternProperties` is valid JSON Schema: keys
  matching `properties` *or* the pattern are accepted; everything else is rejected.
  Export `CUSTOM_COLOR_RE` from `schema.ts` (or a shared module) so the validator and
  the generator can't drift.
- **Regenerate both source copies** of `theme-v1.json`:
  `packages/theme/theme-v1.json` and `apps/playground/public/schemas/theme-v1.json`
  (the `dist/` copies are build output). Note: `generate-theme.ts:13–14` claims CI
  re-runs the generator and fails on drift, but `.github/workflows/ci.yml` has no
  `gen:theme` / `git diff --exit-code` step — that safety net does **not** exist
  today (pre-existing gap; worth adding alongside this).
- **Lint:** no change to the `no-hardcoded-colors` rule or
  `reserved-tokens.generated.js` — `var(--color-x-*)` already passes (§4). *Optional:*
  add a `veneerui doctor` advisory (see "Gaps").
- AGENTS.md §4 + authoring-guide: document the namespace, the
  `[color:var(--color-x-*)]` consumption pattern, the `var()`-no-fallback footgun,
  and "declare your custom colors in your app base theme (or rely on the base-theme
  fallback)."

## Worked migration: the medal island
`LeaderboardView.tsx:75` `text-[#cd7f32]` (bronze) → `[color:var(--color-x-bronze)]`
(or `[color:var(--color-x-bronze,currentColor)]`), with `color-x-gold/-silver/-bronze`
defined in the app's **base** `photoguessr.json` (and optionally recolored by other
themes). The island disappears; podium colors re-skin per theme; absent themes fall
back to the base palette. **Migration is manual/assisted** — `veneerui migrate`
(`migrate.ts`) only *flags* hardcoded colors; it can't invent the token name to
rewrite to.

## Security analysis
- **Name:** bounded by `CUSTOM_COLOR_RE` (lowercase/digits/hyphen, ~32-char cap) and
  `MAX_CUSTOM_COLORS`. No path/prefix escape, no flooding.
- **Value:** `hasDangerousPattern` + `checkValue(_, 'color')` — the same gate as
  schema colors. `DANGEROUS_PATTERNS` blocks `url()`, `@import`, `javascript:`,
  `expression()`, and `;{}<>` (`validate.ts:29–35`), so a value can't break out of
  the single property. **No `var()`** in custom values (new in v2): Node/CI
  (`matchProperty`) rejects `var()` while the browser (`CSS.supports`) accepts it,
  and `storage.ts:80–86` does *not* re-validate localStorage themes on apply — so an
  imported `color-x-*: var(...)` would otherwise persist and apply unchecked. The
  explicit `/var\s*\(/i` reject closes that browser/Node skew for v1. (Schema colors
  share the skew in principle but are curated; revisit allowing `var()` later if a
  real need appears.)
- **Threat model for the cap (corrected):** the adversary is an **untrusted
  imported/community theme** (`validate.ts:2`; `import-theme.ts` fetches arbitrary
  URLs) — *not* the app author, who controls their own app. `MAX_CUSTOM_COLORS` is a
  **per-theme anti-DoS** bound on `validateTheme` (builtin themes bypass it). Set it
  generously — the proposal's own examples include chart series and category palettes
  that can exceed 24 — e.g. **64** (treat as anti-DoS, not a UX limit). Over-cap is a
  hard `fail()`, not a silent drop, so an author sees why.
- **Blast radius:** a custom color can only set a `--color-x-*` variable to a valid,
  `var()`-free color string. It cannot reach any other property or selector.
- **Out of safety scope:** `checkValue` validates CSS *grammar*, not *contrast*.
  Schema colors get human curation plus paired `color-text-on-*` tokens; custom
  colors get neither. The safety claim is "as safe against injection as schema
  colors" — contrast/a11y is the author's responsibility (a `doctor` advisory is a
  reasonable future add).

## Touchpoints summary
| File | Change |
|---|---|
| `packages/theme/src/validate.ts` | custom-namespace branch + `CUSTOM_COLOR_RE`, `MAX_CUSTOM_COLORS`, `customCount`, `var()` reject |
| **`packages/theme/src/apply.ts`** | **set + clear `--color-x-*` (the key runtime change v1 missed)** |
| `packages/theme/src/anti-flash.ts` | **no change** (already generic); verify in-sync test still holds |
| `packages/theme/src/ThemeProvider.tsx` | base-theme `color-x-*` fallback merge before `applyTheme` |
| `packages/theme/src/schema.ts` | export shared `CUSTOM_COLOR_RE` |
| `scripts/generate-theme.ts` | `patternProperties` from `CUSTOM_COLOR_RE.source`; regenerate both `theme-v1.json` source copies |
| ~~`reserved-tokens.generated.js` / lint rule~~ | **no change** (var() already allowlisted); optional `doctor` advisory only |
| `AGENTS.md`, `docs/authoring-guide.md` | namespace + `[color:var(--color-x-*)]` consumption + fallback + footguns |
| tests | validator accept/reject + malformed-name fail + cap; `apply.ts` set/clear/switch; provider fallback; **v1 theme *with* custom colors still validates as schemaVersion 1** |

## Open questions
1. **Namespace name** — `color-x-*` (recommended, required by Tailwind `@theme`) vs
   `palette-*` / `brand-*` (would forfeit utility generation).
2. **Cap** — 64 as anti-DoS? Per-theme is the only thing `validateTheme` can enforce
   (resolved: per-theme).
3. **Utilities** — ship var-consumption docs only, or also scaffold the app `@theme`
   registration pattern (and a `veneerui doctor` note)?
4. **Fallback source** — resolved: the app's base theme
   (`themes.find(id === defaultThemeId)`), **not** `DEFAULT_THEME_ID`. Should the base
   theme id be its own `ThemeProvider` prop, or is reusing `defaultThemeId` enough?
5. **Schema version** — resolved: **no bump.** `validate.ts:75` hard-rejects any
   `schemaVersion !== SCHEMA_VERSION` and there is no migration tool, so a bump would
   break every existing theme on disk/localStorage. Custom colors are purely additive
   — keep schemaVersion 1; add a test proving a v1 theme *with* custom colors validates.
6. **JS read path** — how should `tokenValue(theme, 'color-x-*')` behave? (See §6
   decision; leaning "unsupported in v1, use `var()`/utilities".)
7. **Dangling-reference enforcement** — should a new `doctor` check cross-reference
   `var(--color-x-*)` usages in source against the base theme's declared customs, to
   catch typos and never-defined names? (Net-new work; see Gaps.)

## Gaps to scope (from the v1 review; not all blockers)
- **No enforcement that a referenced custom color is ever defined.** Lint allows any
  `var(--…)`, so typos (`var(--colour-x-gold)`) and never-declared names render as the
  CSS initial value with no warning. The right home is a new `veneerui doctor` check
  (Open Q7) — the lint rule deliberately doesn't resolve names, and shouldn't.
- **No inline-fallback convention** — recommend `[color:var(--color-x-*,currentColor)]`
  as the documented default (§4).
- **Conflicting missing-value semantics** between var-only and `@theme`-registered
  consumption (§5 footgun) — document and recommend duplicating the base value into
  any `@theme` default.
- **`tokenValue` read path** returns `''` for undefined customs (§6 / Open Q6).
- **No contrast/a11y validation** for custom colors (Security, out-of-scope note).
- **Builtin↔gallery drift** is CI-guarded for the 11 gallery themes (`check:builtin`);
  app custom colors live outside this repo, and the two hand-authored `default-*`
  themes are exactly where app palettes should *not* go — so drift risk is low here.
- **Missing CI drift gate** for `generate-theme.ts` output (§7) — pre-existing; worth
  adding since this change leans on regeneration.

## Out of scope
- Non-color custom tokens (custom spacing/radii/shadows). The same pattern could
  extend to them later, but colors are the concrete need; keep v1 to `color-x-*`.
- Per-component theme overrides / scoped themes.
- Allowing `var()` inside custom color values (deferred until a concrete need; see
  Security).
