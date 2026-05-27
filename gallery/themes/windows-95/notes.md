# Windows 95 — design notes

The opposite of the soft, blurred, rounded default. Every cue here is a hard edge,
which is exactly what makes it a good stress test: it proves shadow *shape*,
radius, border width, and motion *duration* are first-class theme axes.

- **Bevels, not shadows.** `shadow-*` are outset two-tone chisels — a white
  highlight up-and-left, a `#404040` shade down-and-right (`-1px -1px 0 #ffffff,
  2px 2px 0 #404040`). No blur, no spread. That single trick is the entire raised
  look of every panel and button.
- **Hard square corners.** All radius tokens are `0px`. Pills, dots, and avatars
  become rectangles — correct for the era.
- **Battleship gray.** Surface, raised, and overlay are all `#c0c0c0`; depth comes
  from the bevel edges, not from tint changes between layers.
- **The title bar.** `gradient-primary` / `gradient-text` are the
  `#000080 → #1084d0` navy-to-cyan sweep, so the hero headline and the showcase
  band read as a maximized window's title bar.
- **The actual UI font.** `font-sans`/`font-display` are **MS Sans Serif** — the
  bundled Windows 95/98 bitmap face — not `system-ui`, which resolves to a modern
  San Francisco / Segoe and instantly breaks the spell. Weights are capped at 700;
  the OS never shipped a 900. It's a vector recreation of the pixel grid, so the
  hero scales up chunky and the body stays crisp.
- **No motion.** `duration-*` are all `0`, so states snap instantly. Win95 didn't
  animate, and neither does this.
