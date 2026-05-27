# Sharp Minimalist — design notes

The clean product register — the look most real apps actually ship. Its identity
is **restraint plus one confident color**, not ornament.

- **A single indigo.** `#5b5bd6` carries the whole theme; the accent is just a
  deeper shade of it (`#4f46e5`) so the palette stays tonal, never busy. Status
  colors are the only other hues, and they're the standard crisp set.
- **Depth from borders, not shadows.** `surface-raised` is the *same* white as
  the page — cards separate with a hairline `border` (`#ececec`) and only the
  faintest shadow. Nothing floats; everything sits flat and precise.
- **Tight, not round.** Radii run 3/6/8px — softened just enough to not read as
  brutalist, sharp enough to feel engineered. Borders stay 1px hairlines.
- **Dense type.** `text-base` drops to 15px and display tracking tightens to
  `-0.045em`, so headings feel set, not spaced. The font never changes — Inter
  does everything, which is the point: the discipline is in the spacing.
- **High contrast.** Near-black `#0a0a0a` text on pure white. No warm tints, no
  personality in the neutrals — the indigo is the only voice in the room.
