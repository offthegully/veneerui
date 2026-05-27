# Editorial — design notes

The print-magazine register: it's carried by **type and rhythm**, not color.

- **Serif everywhere, two faces.** Body is Source Serif 4; `font-display` is
  Fraunces, a high-contrast face whose thick/thin stroke variation gives
  headlines drama. The contrast *between* the two faces is the effect — a single
  serif everywhere would read as "old," not "editorial."
- **An enlarged type scale.** `text-base` starts at 18px (not 16) and the top
  end stretches to 80px. Long-form reading wants a bigger base size, and a wider
  spread between body and display is what makes a page feel art-directed.
- **Generous leading.** `leading-normal` is 1.6 and `relaxed` is 1.85 — airier
  than UI defaults, because columns of prose need room to breathe.
- **Spacing nudged up** to `0.3rem` so the whole layout loosens proportionally.
- **Restrained, warm palette.** A burnt-sienna primary (`#9a3412`) and a single
  navy accent on warm paper (`#faf7f0`). The color stays quiet on purpose so the
  typography is unmistakably the star. Small radii (2–6px) — paper has edges.
