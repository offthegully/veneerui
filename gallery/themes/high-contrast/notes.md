# High Contrast — design notes

An accessibility-first theme, and the one we use as the conformance yardstick: if
switching to High Contrast leaves any part of the UI unchanged, that part has a
hardcoded color.

- **Pure black on pure white.** `text` is `#000000`, `surface` is `#ffffff`, and
  even `text-muted` stays black — muted-by-lightness fails contrast, so secondary
  text is distinguished by size/weight, not by going gray.
- **Link/primary blue is the classic `#0000ee`.** It's the system default visited
  color authors recognize and it clears AAA on white.
- **Borders do the structuring, not shadows.** Soft drop shadows are invisible to
  low-vision users, so every "shadow" token is a solid `0 0 0 2px #000000` ring —
  a crisp outline instead of a blur. Border width jumps to `2px`.
- **Sharp corners.** All radii `0px`: rounded corners cost edge contrast.
- **Bigger text, heavier weight.** `text-base` 18px and `font-weight-normal`
  bumped to 500, since thin black text on white can shimmer.

This theme deliberately overrides color **and** structure (border-width, radius,
shadow), which is why it's the drastic theme the conformance test applies.
