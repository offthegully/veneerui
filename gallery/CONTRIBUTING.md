# Contributing a theme

> Authoring is entirely local: you write a `theme.json`, preview it in the app, and
> save it to your own library. Nothing here needs an account or a server. Once the
> gallery lives in its own public repo, themes will also be shareable by PR.

## The local flow

1. **Start from an example.** Copy a `themes/<slug>/theme.json` whose look is
   closest to your idea. Every token you omit falls back to its schema default,
   so you only set what makes your theme different.
2. **Edit with autocomplete.** Keep the `"$schema"` line at the top so your editor
   suggests token names and flags invalid values and unknown tokens as you type.
   The full list is in [`docs/schema-reference.md`](../docs/schema-reference.md).
3. **Preview it.** In the app: theme switcher → **Manage themes** → drop your
   file. It's validated locally and applied live. Iterate until it's right, then
   **Save to library**.
4. **Write `notes.md`.** A short explanation of *why* you chose the values —
   that's what makes a theme a good template for the next author.

## Sharing a theme

When the gallery is a public repo, sharing is a pull request: add
`themes/<your-slug>/theme.json` (+ `notes.md`) and open a PR, and CI runs the same
`validateTheme()` you see locally. A maintainer reviews and merges. There's no
upload form and no `POST` endpoint — the PR *is* the submission, and CI validation
is the security boundary.

## What validation enforces

- **Valid CSS values only.** Every token value is checked against the CSS grammar
  for its type. A `color` must be a real color, a `shadow` a real `box-shadow`,
  and so on.
- **No external resources or injection.** `url(...)`, `@import`, `javascript:`,
  `expression(...)`, and the characters `; { } < >` are rejected outright. A theme
  is inert data; it can never load or execute anything.
- **Fonts from the bundled set only.** Because `url()` is banned, a theme can't
  ship a font — it may only *name* one Veneer bundles, plus CSS generic keywords
  (`serif`, `sans-serif`, `monospace`, `system-ui`, …). The current families and how
  to load each are in [`docs/fonts.md`](../docs/fonts.md). Naming anything else is
  rejected so themes can't silently fall back to a broken look.
- **Required tokens present.** `color-primary`, `color-surface`, and `color-text`
  must be set; everything else falls back to a sensible default.
- **Custom `color-x-*` colors are accepted, never required.** The reserved
  `color-x-<slug>` namespace lets an *app* define its own themeable colors; each
  value is validated like any color (a real CSS color, no `var()`). They're
  app-defined, so a gallery theme need not declare any — see the
  [authoring guide](../docs/authoring-guide.md#4-custom-colors-beyond-the-schema-palette).
