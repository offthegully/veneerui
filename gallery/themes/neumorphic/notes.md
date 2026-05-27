# Neumorphic — design notes

"Soft UI" — elements look extruded from a single sheet of material. The trick is
that there's essentially **one surface color** and all the shape comes from
shadows.

- **One color for everything.** `surface`, `surface-raised`, and the page are all
  `#e0e5ec`. Neumorphism falls apart the moment surfaces differ in color, because
  then it looks like normal cards, not extrusions.
- **Paired shadows are the whole technique.** Every shadow is two layers: a dark
  one down-right (`#c5c9cf`) and a light one up-left (`#ffffff`). That simulates a
  single light source and is what makes a flat panel look raised. The inset
  variants reverse it (`inset …`) to press elements *into* the sheet — use them
  for inputs and wells.
- **Big radii.** 16–40px. Soft material doesn't have crisp edges.
- **Slow, smooth motion.** 300ms with eased curves; the style is calm, so the
  motion should be too.
- **Caveat.** The low-contrast text (`#4a5568` on `#e0e5ec`) is the look's known
  accessibility weakness. It's faithful to the style, but if you ship it, darken
  `color-text` toward `#2d3748` to clear WCAG AA. Honesty over fidelity.
