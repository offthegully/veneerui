# Midnight — design notes

A dark theme that follows the two rules most "just invert it" dark modes break.

- **Raised surfaces get *lighter*, not darker.** In the real world, light comes
  from above, so a lifted card catches more of it. `surface` is `#0b1120`,
  `raised` is `#131c31` (lighter), `sunken` is `#060912` (darker). Inverting a
  light theme does the opposite and everything looks wrong without anyone being
  able to say why.
- **Accents are brightened, not reused.** A primary that reads well on white
  (`#2563eb`) disappears on near-black. Midnight lifts it to `#60a5fa` and makes
  `hover`/`active` go *lighter* (`#93c5fd`/`#bfdbfe`) — the opposite direction
  from a light theme, because on dark backgrounds "more emphasis" means "more
  light."
- **`text-on-primary` flips to dark.** The primary is now a light blue, so text
  sitting on a primary fill must be dark (`#0b1120`), not white. This is the
  single most common dark-theme bug — white-on-light-blue buttons.
- **Shadows go deep and soft** (`rgb(0 0 0 / 0.5)` and up). On dark surfaces a
  faint shadow is invisible; the elevation has to come from a darker, larger
  blur. A gradient is included for primary surfaces that want some life.
