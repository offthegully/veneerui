# Brutalist — design notes

Proof that a theme is more than a color swap. Almost none of what makes this
theme recognizable is color — it's border width, radius, shadow shape, type, and
motion.

- **Borders carry the look.** `border-width-default` jumps to `3px` and every
  border color is pure `#000000`. Heavy black rules are the whole vocabulary.
- **Zero radius, everywhere.** All seven radius tokens are `0px`. Half-measures
  read as a mistake; commit to the corners.
- **Hard offset shadows, no blur.** `4px 4px 0 0 #000000` — an opaque black
  rectangle shoved down-right. The `0 0` (no blur, no spread) is what makes it
  look printed rather than lit. This is the token that says "brutalist" loudest.
- **Display face + tight tracking.** `font-display` is Archivo Black (the one
  bundled face heavy enough to matter); body stays Inter at weight 500 so it's
  still readable. Tracking goes negative (`-0.04em`) to pack the headlines.
- **Snappy linear motion.** Durations drop to 60–180ms and easing is `linear` —
  no soft acceleration. Things snap; they don't glide.
