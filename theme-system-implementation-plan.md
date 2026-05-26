# Theme System Implementation Plan

This plan breaks the work described in `theme-system-overview.md` into six phases. Each phase delivers something usable on its own — you can pause at any phase boundary and ship what exists. The order is chosen so that early phases unblock later ones and so that the irreversible decisions happen up front, while reversible ones come later.

The near-term goal is **implementation, not a marketplace**: get the runtime working, make the app's components genuinely themeable, and ship a handful of example themes that people can use. Themes are distributed as a static **GitHub gallery** (a public repo + optional GitHub Pages site), not a custom backend — so there is no server, no database, and no user accounts to build for v1.

Rough total effort for a single experienced developer: **6–10 weeks**, depending on how much of the existing UI has to be retrofitted onto tokens (Phase 2) and how much gallery polish you want. There's no backend workstream, so a second developer mostly helps by parallelizing component adoption (Phase 2) against runtime/authoring work.

---

## Approach

**Build the foundation first.** The token schema is the single hardest thing to change later because every theme ever published targets it. Get it right before writing any UI or storage code that depends on it.

**Build the runtime, then make the app themeable.** A working library + switcher + built-in themes is the spine of the system — but it's worthless if the app's own components don't actually consume the tokens. Treat component adoption as a real phase, not an afterthought, because a single hardcoded color is an island no theme can reach.

**Defer the server entirely.** No marketplace backend, no accounts, no install database. Themes are distributed as a static GitHub gallery and curated by PR review. This removes the largest and least-essential workstream from v1, and the import/snapshot model is designed so a server can be added later without changing the theme format.

**Defer the editor.** The in-app visual editor is the biggest single piece of work and the most premature. Authors can develop themes locally in JSON for v1, and you get real data about what tools they actually need before committing to the editor design.

---

## Phase 0: Foundations (2–3 weeks)

The work here is small in code but consequential. Most of it is decisions and shared infrastructure. This phase is longer than it might appear because the token schema design demands real care — it's the single hardest thing to change later, and the difference between a schema that supports "palette variants" and one that supports "fundamentally different design languages" lives entirely in how thoughtfully you assemble the token list now.

### Deliverables

**Token schema definition.** A focused design effort to lock in the initial token list. Target **80–120 tokens** covering colors, surfaces, text, borders, radii, shadows, typography (family + size + weight + leading + tracking), spacing, effects (backdrop-blur, gradients), and motion (duration + easing). This is large enough to support genuinely different design languages — brutalist, neumorphic, glassmorphic, editorial, minimal — not just recolored variants. Validate by prototyping 3–4 representative themes in dramatically different aesthetics; if any of them can't be expressed, the schema is missing tokens. Resist the urge to add per-component tokens (e.g., `button-radius`); keep tokens semantic and let components compose them.

**Tailwind v4 setup.** Adopt Tailwind v4 if not already on it. Set up the `@theme` directive in the app's main CSS file, declaring every token from the schema with its default value. Verify utility classes are generated correctly (`bg-primary`, `rounded-md`, `font-display`, `duration-default`, etc.) and that opacity modifiers work via `color-mix()`.

**TypeScript types.** Define the canonical types: `Theme`, `TokenDef`, `TokenType` (color | length | shadow | fontFamily | number | easing | gradient), `ThemeLibrary`. Export them from a shared module that both the app and any future backend can import.

**Validation library.** A pure function `validateTheme(json) → { valid, errors, theme }` that runs in both browser and Node. Validates structure, token names against the schema, value formats per token type, and security blacklist patterns. This will be reused on every phase that follows. With more token types (easing, gradient), the validator needs corresponding type-specific checks — easing values must parse as valid timing functions, gradient values must start with a known gradient function. For `fontFamily` tokens, validate that the named family resolves to the **bundled font set** (below) or a generic system stack, since the `url()` blacklist means a theme can never load its own font.

**Bundled font set.** Because the security model forbids `url()`, themes can only *name* fonts that the app already loads. Choose and bundle a small curated set — a sans, a serif, a mono, and one or two display faces (enough to support editorial and brutalist looks) — loaded by the app itself. Publish the list of allowed family names so authors (and the validator) know what's available. Expanding this set is a deliberate, versioned app-level decision.

**Schema generators.** A script that emits a JSON Schema document from `TOKEN_SCHEMA`, used both for the published `theme-v1.json` schema URL and for generating the schema reference docs. The generated JSON Schema should constrain `fontFamily` values to the bundled set. Both artifacts should be regenerated as part of CI so they never drift from the source schema.

### Decisions blocked on this phase

- Is the token set complete enough? (Run a thought experiment: try to express a brutalist theme, a neumorphic theme, and a glassmorphic theme using only your tokens. If any can't be expressed, what's missing?)
- Tailwind v3 vs v4? (Recommendation: v4. Strictly nicer for this use case.)
- Storage format for tokens — hex, oklch, or accept anything? (Recommendation: accept any valid CSS color via `CSS.supports`. v4 handles the conversion.)
- How aggressive to be with spacing/typography tokens? (Recommendation: include them. Without them, themes can't express density or typographic personality.)
- Which fonts to bundle? (Recommendation: a sans, serif, mono, and one or two display faces. This caps what `fontFamily` tokens can express; pick faces that cover the aesthetic range you want — e.g. a dramatic display family for brutalist/editorial.)
- Where does library state live? (Recommendation: `localStorage`, single-browser, no server or account for v1. Cross-device sync is explicitly deferred.)

---

## Phase 1: Core Runtime (1–2 weeks)

Goal: a working app with multiple built-in themes, a switcher, and persistence. No authoring, no marketplace yet.

### Deliverables

**`applyTheme(theme)` function.** Iterates the schema, sets `--<token>` inline styles on `document.documentElement` for tokens the theme defines, removes inline styles for tokens it doesn't (letting `:root` defaults take over).

**`ThemeProvider` component.** React context wrapping the app. Holds the `ThemeLibrary` state, exposes `useTheme()` hook returning `{ themes, enabledIds, currentId, setCurrent, ... }`. Persists to `localStorage` on every change.

**SSR-safe initial application.** A small synchronous script in `<head>` that reads `currentId` from `localStorage` and calls `setProperty` for each token before React hydrates. Prevents flash-of-default-theme.

**Switcher UI.** A compact dropdown component. Lists enabled themes (with small preview swatches), shows current selection with a checkmark, links out to library management and marketplace pages (placeholders for now). Clicking a theme calls `setCurrent` and `applyTheme`.

**Built-in themes.** Four or five shipped with the app, deliberately chosen to demonstrate the range the schema allows:
- `default-light` — the baseline; uses the `:root` defaults
- `default-dark` — a proper dark theme demonstrating inverted surface relationships
- `high-contrast` — black-on-white, thick borders, sharp corners — for accessibility AND to show that border-width and radius are real theme axes
- `editorial` — serif display font, generous spacing, restrained color palette, subtle shadows — shows typography and spacing as primary theme dimensions
- (optional) one expressive theme (brutalist, neumorphic, or glassmorphic) to demonstrate the schema's full range from day one

These ship as JSON files in the codebase and are merged into the library on app load with `source: 'builtin'`. Their secondary purpose is showing prospective theme authors that the schema actually supports meaningful aesthetic variety, not just color swaps.

**Library persistence.** Save/load `ThemeLibrary` state to `localStorage`. Migrate gracefully if the format is missing or malformed (fall back to library = built-ins, current = default-light).

### Validation criteria

- Switching themes is instantaneous (no flicker, no re-render of components)
- Reloading the page preserves the selected theme with no flash of the default
- All four built-in themes look intentional, not just "the same UI with different colors"

---

## Phase 2: Adoption & Conformance (1–2 weeks)

Goal: make the app's own components genuinely themeable, and keep them that way. This is the piece that's easy to skip and the reason theme systems half-work in practice — the runtime can be perfect, but if components hardcode colors, switching themes leaves visible islands untouched. For an existing app this is the single largest piece of work; budget for it honestly.

### Deliverables

**Component conversion.** Audit every component and replace hardcoded visual values — `bg-blue-500`, `text-[#333]`, inline `style={{ color }}`, raw `box-shadow`/`border` values in CSS modules — with semantic token utilities (`bg-primary`, `text-text-muted`, `rounded-md`, `shadow-card`). The work is mechanical but broad; it touches most of the UI. Resist introducing per-component tokens to paper over a gap — if something can't be expressed, that's schema feedback for Phase 0, not a reason to hardcode.

**Lint rule.** An ESLint (and/or Stylelint) rule that fails CI when a component uses a hardcoded color, an arbitrary-value color utility (`bg-[#…]`, `text-[rgb(...)]`), or an inline color style — anywhere outside the `@theme` declaration. This is what prevents regressions after the conversion; without it, the next feature reintroduces islands.

**Conformance check.** An automated test that renders a representative slab of the app, applies a deliberately drastic theme (`high-contrast` is ideal — black/white, thick borders, sharp corners), and asserts there are no un-themed islands. Practically: snapshot or computed-style assertions that key surfaces actually changed, or a visual-regression pass across two very different themes. Catches the components a manual audit missed.

### Validation criteria

- Switching to `high-contrast` re-skins 100% of the rendered UI — no leftover default-blue buttons, no white cards on a black page
- The lint rule fails CI on a deliberately introduced `bg-blue-500`
- A new component written after this phase cannot ship a hardcoded color without CI catching it

---

## Phase 3: Local Authoring & Import (1–2 weeks)

Goal: an external author with a text editor can create a theme, preview it in the app, and save it to their library — and any user can import a theme they got from the gallery (a downloaded file or a raw URL). This phase produces both the authoring experience and the example themes that seed the gallery.

### Deliverables

**Published JSON Schema.** Host `theme-v1.json` at a stable URL (e.g. `https://yourapp.com/schemas/theme-v1.json`). Generated from `TOKEN_SCHEMA` so it stays in sync. Theme files reference it via `$schema`.

**Schema reference doc.** Auto-generated markdown listing every token in `TOKEN_SCHEMA` grouped by category, with name, type, description, default value, and one or two example values. Generated as part of CI.

**Authoring guide.** Hand-written conceptual guide covering: starting from an example, picking a coherent palette, the relationship between primary and its hover state, dark vs light surface conventions, contrast minimums, common pitfalls. Two to three pages of prose.

**Contribution guide.** Hand-written guide describing how to share a theme: open a PR adding the `theme.json` to the gallery repo (the full gallery workflow lands in Phase 4). For this phase it can be a stub describing the local-only flow ("for now, save to your library; gallery contribution via PR arriving in [date]").

**Example themes.** Six to eight fully-realized themes, each with a `theme.json` and a brief `notes.md` explaining the choices made. These live in the directory that **becomes the GitHub gallery repo in Phase 4** — they're not throwaway samples, they're the initial gallery contents and the "couple of themes people can use" out of the gate. They're also how authors learn what the schema is capable of and proof that the system supports genuine aesthetic variety. Any font they reference must come from the bundled set (Phase 0). Cover meaningfully different design languages, not minor variations:
- `clean-light` — the conservative baseline; neutral palette, modest shadows, restrained typography
- `midnight` — proper dark theme with raised surfaces lighter than base
- `brutalist` — thick black borders, 0 radii, hard-offset shadows, display fonts, tight tracking, snappy linear motion
- `neumorphic` — large radii, dual inset+outset shadows, low-contrast surfaces, smooth easing
- `glassmorphic` — translucent surfaces with backdrop-blur, subtle borders, gradient accents
- `editorial` — serif display fonts, generous spacing scale, dramatic type contrast, restrained color
- `high-contrast` — black-on-white, thick borders, large text, sharp corners — for accessibility
- (optional) one expressive personality theme (warm paper, retro, neon, etc.)

These do double duty as starting templates for authors. Each `notes.md` should explain *why* the token values were chosen, not just *what* they are — that's where authors learn the design thinking, not just the syntax.

**"Preview & import" screen.** A new app page accessible from the switcher's "Manage themes" link. This is both the author's preview loop and the user's import path for gallery themes. UI:
- Drop zone for a `theme.json` file (or file picker button), **and** a field to paste a **raw URL** (e.g. a `raw.githubusercontent.com` link from the gallery), which the app fetches
- On drop/fetch: validate, then apply the theme to the live app and show a persistent top banner ("Previewing untested theme: [name] by [author]") with "Save to library" and "Stop preview" buttons
- "Save to library" adds the theme with `source: 'custom'` for a locally-authored file, or `source: 'imported'` (recording `sourceUrl`) when it came from a URL
- "Stop preview" restores the previous theme

Fetching an arbitrary URL is safe here because the result is treated as inert data and run through the same `validateTheme()` before it can touch the DOM — there's no code path from a fetched file to execution. `raw.githubusercontent.com` serves permissive CORS, so the fetch works from the browser without a proxy.

**Optional: file watcher.** Using the File System Access API (Chromium browsers), allow the author to grant ongoing access to their theme file so edits auto-reload the preview. A real DX win; not essential.

### Validation criteria

- An author with no prior context can open the README, copy `clean-light.json`, edit colors in VS Code with autocomplete working, drop the file into the preview screen, and see their theme applied — all within 10 minutes
- A user can paste a raw gallery URL and have the theme validated, previewed, and saved to their library without downloading a file first

---

## Phase 4: Gallery (GitHub) (about 1 week)

Goal: themes can be shared publicly and discovered by any user — without a server, a database, or accounts. This replaces the heavy "marketplace" phase entirely. The gallery is a public GitHub repo (the same one that holds the Phase 3 example themes), optionally with a GitHub Pages site for browsing.

### Deliverables

**Gallery repo.** A public repository whose `themes/` directory holds one validated `theme.json` per published theme (with optional `notes.md`). A `README` explains how to browse, import, and contribute. This is just files in git — no backend.

**CI validation.** A GitHub Action that runs the Phase 0 `validateTheme()` (in Node, using `css-tree` since `CSS.supports` is browser-only) on every PR that adds or changes a theme. The PR cannot merge unless validation passes. This is the security boundary that the old server-side upload endpoint used to be — and it's the curation step (a human reviews and merges).

**Contribution flow (PR).** Documented in the repo: an author adds their `theme.json`, opens a PR, CI validates, a maintainer merges. No upload UI, no auth, no `POST` endpoint to build.

**Optional: GitHub Pages browse site.** A static site generated from the repo that renders a card per theme — a programmatic preview swatch (from token values, no image hosting), name, author, tags, and a "copy raw URL" / download button. Generation can be a build step over the `themes/` directory. If skipped, users browse the repo directly on GitHub.

**Import path (already built).** Installing a gallery theme reuses the Phase 3 "Preview & import" screen: download the `.json` and drop it, or copy its raw URL and paste it. The app validates client-side (defense in depth), saves a snapshot with `source: 'imported'` and `sourceUrl`, and shows a toast. There is no server round-trip and nothing to track server-side.

### Validation criteria

- A theme contributed by author A (merged via PR) can be imported by user B from its raw URL and applied with no manual intervention
- A PR adding a theme with a malicious value (e.g. `"color-primary": "red; } body { display:none"`) fails CI with a clear error and cannot merge
- The browse site (if built) previews themes without re-theming itself (scope the preview to each card)

---

## Phase 5: Library Curation (1–2 weeks)

Goal: users can manage their library — enabling/disabling themes for the switcher, reordering them, and removing them. All of this is local; there's no server, so there's no account or server-driven notification to build.

### Deliverables

**Library management page.** Lists every theme in the library with:
- Name, author, version, source badge (built-in / imported / custom)
- "Enabled in switcher" toggle
- Drag handle to reorder enabled themes (order in switcher)
- Remove button (for non-built-ins)
- Update available indicator (only for imported themes with a `sourceUrl`, if the optional check below is built)

**Optional: GitHub-based update check.** For themes imported with a `sourceUrl`, the client can re-fetch that raw URL (on demand or on load), parse the `version`, and compare to the stored copy. If newer, show an "Update available" indicator; updating is explicit — the user clicks "Update," the new JSON is fetched, validated, and replaces the local copy. This is best-effort and low-priority: it depends only on a public raw URL being reachable, not on any server we run. Themes imported from a one-off file (no URL) simply don't participate.

**Optional: gallery contributions are just PRs.** There's no author dashboard to build — an author's "published themes" are their merged PRs in the gallery repo, and publishing a new version is another PR. The contribution guide (Phase 3) is the whole story.

### Validation criteria

- A user can import 10 themes and have only 3 visible in their switcher
- Toggling enabled status is one click and reversible
- Removing an imported theme deletes it from `localStorage`; built-ins cannot be removed
- (If the update check is built) bumping a theme's `version` in the gallery surfaces an "Update available" indicator the next time the user's client re-fetches its `sourceUrl`

---

## Decisions to make up front

These should be settled at or before Phase 0. They shape everything downstream.

**How many tokens?** Recommendation: 80–120, organized by category. This is large enough for themes to express fundamentally different design languages (brutalist, neumorphic, glassmorphic, editorial) rather than just color variations. Smaller schemas (~30 tokens) constrain themes to palette swaps; larger schemas (~200+) become an authoring burden with diminishing returns. The sweet spot is the smallest schema that supports the aesthetic range you want users to be able to publish.

**Tailwind v3 or v4?** Recommendation: v4. Cleaner `@theme` integration, native `color-mix()` for opacity, fewer hacks. Migrating from v3 mid-project is painful; pick the right one now.

**Light/dark as one axis or two?** Recommendation for v1: separate axis for built-in themes (so OS preference can drive the toggle), single-mode for user-authored themes. Revisit if marketplace authors start requesting dual-mode authoring.

**Per-component overrides?** Recommendation: no, for v1. Defer indefinitely. The token model is enough for the vast majority of theming needs. Per-component overrides explode the schema and the authoring surface.

**Where do themes live / how are they distributed?** Recommendation: a static **GitHub gallery** (public repo + optional Pages site), no custom server, no accounts, for v1. Curation is PR review; CI validation is the security boundary. A server-backed marketplace is additive later and doesn't change the theme format.

**Where does the library live?** Recommendation: `localStorage`, single-browser, no sync, for v1. Cross-device sync is the main thing a future server would add; calling it a non-goal now keeps the data model honest (one source of truth, the local copy).

**Which fonts ship with the app?** Recommendation: a small curated bundle (sans, serif, mono, one or two display faces). The `url()` blacklist means themes can't load fonts, so `fontFamily` tokens can only name what the app bundles — pick faces that cover the aesthetic range you want themes to reach.

**Snapshot or live-link imports?** Recommendation: snapshot. Protects users from breakage, works offline, prevents author bait-and-switch. Phase 5's optional `sourceUrl` re-fetch preserves the upgrade path.

---

## Risks and mitigations

**Token schema design is wrong, discovered late.** Hardest problem to fix; the schema is a contract every published theme depends on. Mitigation: spend real time on Phase 0. Prototype against existing visual designs. Get a designer's eyes on the token list. Don't open the schema to external authors (Phase 3) until you're confident.

**Validation gaps allow malicious themes.** Themes are the only path for untrusted data into the visual layer. A missed validation rule could allow CSS injection. Mitigation: validate at three layers (upload, install, apply); maintain both a positive validator (`CSS.supports`) and a negative blacklist; test with a corpus of known-malicious payloads; treat any validation bypass as a P0 security issue.

**Author DX is too rough without an editor.** Authors may give up if iterating in JSON feels miserable. Mitigation: invest in the JSON Schema for autocomplete, ship strong examples, make the preview flow fast (drag-drop + watch mode). If author adoption is slow, the editor moves up the roadmap.

**Adoption gap: components aren't fully tokenized.** The most likely way this system half-works in practice — the runtime is fine, but stray hardcoded colors leave un-themed islands when a user switches to a dramatic theme. Mitigation: treat component conversion as a real phase (Phase 2), enforce it with a lint rule so regressions fail CI, and gate it with a conformance test that applies `high-contrast` and asserts the whole UI re-skins.

**Gallery fills with low-quality themes.** PRs to a public repo can be low-effort. Mitigation: PR review is the gate — a maintainer merges, CI validates safety. Because the gallery is just files in git, pruning or reorganizing is trivial, and there's no install-count machinery to game.

**A theme depends on a font the app doesn't bundle.** Authors may name a font that isn't in the bundled set, expecting it to load — it can't (`url()` is blacklisted), so it silently falls back and looks broken. Mitigation: validate `fontFamily` against the bundled set (Phase 0) so the failure surfaces at authoring/CI time, not on the user's screen; document the available families in the schema reference.

**Schema evolution breaks old themes.** Adding tokens is safe; renaming or removing is not. Mitigation: never rename, rarely remove, version the schema. Treat schema changes with the same care as API changes.

**Performance: many themes in a large library.** A user with 100 themes shouldn't have a slow library page. Mitigation: themes are small (~1 KB JSON), so 100 themes is ~100 KB — well within budget. Virtualize the library list if needed. The library is rarely viewed; the switcher only renders enabled themes.

---

## What you have at each phase boundary

| After phase | What works |
|---|---|
| 0 | Token schema, validation, types, bundled font set — no UI yet |
| 1 | Working app with built-in themes and switcher |
| 2 | App is fully themeable — components consume tokens; lint + conformance keep it that way |
| 3 | Authors build/preview themes locally; users import from a file or raw URL; example themes exist |
| 4 | Public GitHub gallery — themes shared via PR, discovered, and imported; no server |
| 5 | Full local library management; optional `sourceUrl` update checks |

Phase 1 is the minimum runnable system, but **Phase 2 is the minimum *shippable* one** — without it, switching themes leaves visible islands. Phase 3 unlocks authoring and import. Phase 4 makes sharing a one-PR operation. Phase 5 makes a large local library livable. Each is a real release; none of them is a "throwaway prototype."
