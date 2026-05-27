# Sunset Paper — design notes

The "personality" example — warm, friendly, a little playful — to show the schema
can do character, not just clean and corporate.

- **Cream, not white.** Surfaces are warm paper (`#fdf6ec` / `#fffaf2`) and even
  the text is a warm near-black brown (`#3a2d22`) rather than gray-black. Warmth
  has to run all the way through the neutrals or the accent colors look stuck on.
- **A sunset gradient as the signature.** Primary orange `#e85d04` with a
  `gradient-primary` running orange→raspberry (`#d6336c`). The accent picks up the
  raspberry end so the two relate.
- **Rounded and soft.** 14px default radius and gentle brown-tinted shadows
  (`rgb(58 45 34 / …)`) — tinting the shadow with the text brown instead of black
  keeps the warmth even in the shading.
- **A display serif for charm.** Fraunces on headings, Inter for body — the serif
  adds the friendly editorial touch without making body text precious.
- **Playful motion.** `ease-default` overshoots slightly
  (`cubic-bezier(0.34, 1.56, 0.64, 1)`) so things settle with a tiny bounce.
