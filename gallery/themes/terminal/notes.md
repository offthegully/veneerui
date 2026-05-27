# Terminal — design notes

A CRT terminal, not a "dark theme with green buttons." The point is that the
whole personality comes from non-color axes — typeface, depth, and the texture of
the background — with color doing only the obvious phosphor part.

- **Monospace is the theme.** `font-sans`, `font-display`, and `font-mono` are all
  JetBrains Mono. Once every word is fixed-width the page reads as a console
  before you've registered a single color.
- **Light, not shadow.** There is no real elevation — `shadow-*` are a 1px green
  hairline ring plus an outer green bloom (`0 0 18px …`). Panels look lit from
  within, the way phosphor glows, rather than lifted off a surface.
- **Scanlines in the background.** `gradient-surface` is a 4px
  `repeating-linear-gradient` of two near-identical greens, so the page carries a
  faint horizontal banding — the CRT line structure. It's a real token doing real
  texture work, no image needed.
- **Glowing text.** `text-shadow-glow` stacks a tight and a wide green halo; the
  gradient headline runs bright-mint → green so it reads as bloom.
- **Square and snappy.** Radii collapse to 0–2px and motion is `linear` at
  40–160ms — terminals don't ease, they repaint.
- **One warm escape.** Amber (`color-accent`) is the single non-green hue, the
  classic amber-on-green terminal accent for anything that must not be missed.
