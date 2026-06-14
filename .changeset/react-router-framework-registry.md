---
"veneerui": minor
"create-veneerui": minor
---

Add React Router 7 (and TanStack Start) support, on a new framework-profile registry.

- **React Router 7 is first-class.** `npm create veneerui@latest my-app -- --framework react-router`
  (also accepts `remix`) scaffolds and fully wires a React Router 7 app, and `npx veneerui init`
  wires an existing one. It's the first **SSR-on-Vite** framework: Tailwind comes from
  `@tailwindcss/vite` like a Vite SPA, but the anti-flash script goes in the `app/root.tsx`
  `<head>` (the `veneer()` Vite plugin only injects into a real `index.html`, which SSR
  frameworks don't have). No `'use client'` is added (React Router has no RSC boundary). On a
  fresh scaffold Veneer also clears the template's pinned `--font-sans` and
  `bg-white dark:bg-gray-950` surface so type and color theme fully, and — since the template
  ships no ESLint — drops in a minimal `eslint.config.js` + `lint` script so the
  no-hardcoded-colors gate runs out of the box.

- **TanStack Start is auto-wired by `init`.** It's the same SSR-on-Vite shape (a
  `src/routes/__root.tsx` document), so `npx veneerui init` recognizes and wires it identically.

- **Framework-profile registry.** Detection, init wiring, scaffolding, the setup plan, and the
  `'use client'` decision now dispatch off a single `FrameworkProfile` registry that separates
  the two axes the old vite/next split conflated — the Tailwind pipeline (`vite-plugin` vs
  `builtin`) and the anti-flash placement (`index.html` vs document `<head>`). Vite and Next
  behavior is unchanged; adding a framework is now adding a profile.

- **Docs:** the integration guide gains a first-class React Router section and documents the
  Astro per-island provider pattern; the messaging is sharpened to "any React 19 + Tailwind v4
  app works via three steps; SSR frameworks put the anti-flash in `<head>`, not the Vite plugin."
