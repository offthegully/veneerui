# Warm Library — design notes

A cozy reading room, not a magazine. Where Editorial uses *two* faces for drama,
Warm Library uses **one face for everything** — the calm of a well-set book.

- **EB Garamond throughout, chrome included.** `font-sans`, `font-serif`, and
  `font-display` are all EB Garamond. Buttons, labels, and nav are set in the
  same old-style serif as the prose, so the UI reads like part of the page
  rather than a toolbar bolted on. (It earns its keep in italic — the bundled
  italic axis is loaded for exactly this theme.)
- **Paper, not white.** Surfaces are a graded antique cream — `#f5ecd9` page,
  `#f8f0dc` raised, `#ede2c8` sunken — and text is a warm dark brown (`#2b211a`),
  never pure black. The whole thing feels lit by a lamp.
- **Two muted naturals.** A terracotta primary (`#9c4a2a`) and a sage accent
  (`#5e6e4b`) — earthy, low-saturation, the colors of a clothbound spine. Sage
  doubles as `success` because the palette has no room for a brighter green.
- **Sized for reading.** `text-base` is 18px and `leading-normal` is 1.7 —
  Garamond is delicate and wants both size and air. The scale tops out softer
  than Editorial's; this is a book, not a poster.
- **Quiet edges.** 2–4px radii and soft warm-brown shadows. Nothing crisp or
  modern intrudes.
