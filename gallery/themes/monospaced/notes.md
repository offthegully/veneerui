# Monospaced — design notes

The plain-text reader — the "I live in a text editor" aesthetic, but **warm and
papery** rather than the dark CRT of the Terminal theme. They share a font class
and almost nothing else.

- **IBM Plex Mono everywhere.** All four font slots are Plex Mono, body included.
  Monospace prose is the whole conceit, so even `font-display` stays fixed-width;
  the rhythm comes from the even character grid, not from contrasting faces.
- **Amber paper, not a screen.** A warm `#f4ecd8` page with a burnt-amber primary
  (`#b85c1e`) and a moss-green accent (`#3a6b3a`) — the colors of an old terminal
  *printout*, not a glowing tube. Text is a soft near-black brown.
- **Flat, hard elevation.** Shadows are `0 1px 0` / `0 2px 0` with no blur and no
  spread — a printed offset, not a float. Combined with near-square 2px radii it
  reads like ink on a page.
- **Neutralized tracking.** `tracking-tight` and `tracking-tighter` are pinned to
  `0em`. Monospace is already evenly spaced; the schema's negative display
  tracking would crush it, so headings opt out and keep the even cadence.
- **Distinct from Terminal on purpose.** Light vs. dark, amber vs. phosphor-green,
  flat-print shadows vs. glow. Two mono themes that prove the axis isn't one note.
