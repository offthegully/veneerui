# Neon Arcade — design notes

A synthwave look built on the tokens most themes leave at their defaults:
**text-shadow**, **glow shadows**, and the **gradient set**. The whole design is
"things glowing in the dark," so it leans on emitted light rather than cast
shadows.

- **A near-black base, two neon hues.** `surface` is `#0a0118` with raised
  surfaces only a touch lighter. Everything else is one of two neons — hot
  magenta `#ff2bd6` (primary) and cyan `#00f0ff` (accent) — so the palette reads
  as backlit signage.
- **Text glows instead of sits flat.** `text-shadow-glow` is a *two-layer* shadow
  (tight cyan halo + wider magenta bloom) — that doubling is what makes text look
  lit rather than blurred. `text-shadow-md/lg` are single magenta halos for
  smaller headings.
- **Shadows are rims, not drops.** `shadow-*` lead with a `0 0 0 1px` neon ring
  before the dark drop, so cards look outlined in light. `shadow-glow` and a cyan
  `drop-shadow-lg` give floating elements an emitted-light edge.
- **Gradients everywhere.** `gradient-text` (magenta→cyan) is meant for
  `bg-clip-text` headlines; `gradient-primary`/`-accent` fill hero panels;
  `gradient-surface` is a subtle vertical fade for backgrounds.
- **Orbitron display + wide tracking.** The display face is Orbitron — a wide,
  geometric, retro-futuristic sci-fi face — not the heavy grotesque the brutalist
  theme uses, so the two never look alike. `tracking-widest` (`0.3em`) spaces out
  arcade-style labels; the body stays Inter for legibility.
- **Snappy motion.** `duration-default` drops to 120ms with a sharp ease — neon
  UIs feel electric, not languid.
- **`text-on-primary` is dark** (`#0a0118`): the neons are bright, so text on a
  primary fill must be near-black to stay legible.
