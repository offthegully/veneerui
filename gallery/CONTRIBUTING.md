# Contributing a theme

> **Status (Phase 3):** the full PR-based gallery workflow lands in **Phase 4**
> (this directory becomes a public GitHub repo with CI validation on every PR).
> Until then, the loop below is local — you author a file and save it to your own
> library through the app. Nothing here requires an account or a server.

## The local flow (today)

1. **Start from an example.** Copy a `themes/<slug>/theme.json` whose look is
   closest to your idea. `clean-light` is the most neutral base.
2. **Edit with autocomplete.** Keep the `"$schema"` line at the top so your editor
   suggests token names and flags invalid values and unknown tokens as you type.
   The full list is in [`docs/schema-reference.md`](../docs/schema-reference.md).
3. **Preview it.** In the app: theme switcher → **Manage themes** → drop your
   file. It's validated locally and applied live. Iterate until it's right, then
   **Save to library**.
4. **Write `notes.md`.** A short explanation of *why* you chose the values —
   that's what makes a theme a good template for the next author.

## The PR flow (arriving in Phase 4)

When this is a public repo, sharing will be: add `themes/<your-slug>/theme.json`
(+ `notes.md`), open a PR, and CI runs the same `validateTheme()` you see locally.
A maintainer reviews and merges. There is no upload form and no `POST` endpoint —
the PR *is* the submission, and CI validation is the security boundary.

## Rules that CI will enforce (and that the app enforces today)

- **Valid CSS values only.** Every token value is checked against the CSS grammar
  for its type. A `color` must be a real color, a `shadow` a real `box-shadow`,
  and so on.
- **No external resources or injection.** `url(...)`, `@import`, `javascript:`,
  `expression(...)`, and the characters `; { } < >` are rejected outright. A theme
  is inert data; it can never load or execute anything.
- **Fonts from the bundled set only.** Because `url()` is banned, a theme can't
  ship a font — it may only *name* one Veneer bundles: Inter, Source Serif 4,
  JetBrains Mono, Fraunces, Archivo Black, plus CSS generic keywords
  (`serif`, `sans-serif`, `monospace`, `system-ui`, …). Naming anything else is
  rejected so themes can't silently fall back to a broken look.
- **Required tokens present.** `color-primary`, `color-surface`, and `color-text`
  must be set; everything else falls back to a sensible default.
