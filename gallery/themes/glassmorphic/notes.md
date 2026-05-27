# Glassmorphic — design notes

Frosted panels floating over a deep, saturated base. This theme leans hardest on
two token groups most themes ignore: **alpha colors** and **blur**.

- **Translucent surfaces.** `surface-raised` and `-sunken` are white at low alpha
  (`rgb(255 255 255 / 0.08)`), so whatever is behind them shows through. They
  only look like glass when paired with backdrop blur — which is why the `blur-*`
  tokens are set (`10/16/24px`) for components that apply `backdrop-blur`.
- **A solid, deep base.** `surface` itself is opaque `#11091f`. Glass needs
  something rich behind it to refract; translucent-over-nothing just looks gray.
- **Hairline light borders.** Borders are white at 10–30% alpha. On glass, a
  faint bright edge reads as the rim catching light; a solid border would kill
  the effect.
- **Bright violet accents + gradient.** Primary `#a78bfa` with a violet→fuchsia
  `gradient-primary`, because the style wants a little neon glow.
- **`text-on-primary` is dark** (`#1a1730`) — the primary is a pale violet, so
  text on it has to be dark to stay legible.
