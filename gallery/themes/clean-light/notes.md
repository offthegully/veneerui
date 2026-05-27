# Clean Light — design notes

The default-safe theme. If you're forking something to make your own, start here:
it sets a full palette but takes no strong stylistic position, so your changes
read as *your* decisions rather than fights with the base.

- **Palette.** Tailwind's `slate` family for neutrals (`#0f172a` text → `#94a3b8`
  subtle) because it's a touch cooler than pure gray and pairs cleanly with a
  blue primary. Primary is `#2563eb` (blue-600), one step down from the loud
  blue-500 so it looks deliberate; `hover`/`active` walk darker (`700`/`800`)
  rather than lighter, which is the convention on light backgrounds.
- **Surfaces.** Three steps — `surface` white, `raised` barely off-white
  (`#f8fafc`), `sunken` one more step (`#f1f5f9`). Just enough separation to read
  hierarchy without drawing borders everywhere.
- **Shadows.** Tinted with the text color (`rgb(15 23 42 / …)`) instead of pure
  black, so elevation feels like it belongs to the palette. Kept shallow — this
  isn't a theme that wants to float things off the page.
- **Type & shape.** Inter, default 8px radius, default spacing. Nothing to argue
  with; that's the point.
