/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { veneer } from '@offthegully/veneerui/vite'
import { BUILTIN_THEMES } from '@offthegully/veneerui/themes'

// Every gallery theme is a first-visit shuffle candidate. The package ships the
// full theme set as BUILTIN_THEMES; the anti-flash plugin only needs `{ id, tokens }`
// to inline them and apply a random one before first paint. Exclude the two neutral
// defaults so a fresh visitor lands on a *distinctive* theme. themes.ts derives
// APP_SHUFFLE_THEME_IDS from the same BUILTIN_THEMES, so the two pools always agree.
// (Importing the built package means `build:theme` must run first — it already does
// in the `dev`/`build` scripts, the same dependency main.tsx's package imports rely on.)
const DEFAULT_IDS = ['default-light', 'default-dark']
const shufflePool = BUILTIN_THEMES
  .filter((t) => !DEFAULT_IDS.includes(t.id))
  .map((t) => ({ id: t.id, tokens: t.tokens }))

// https://vite.dev/config/
export default defineConfig({
  // veneer() injects the anti-flash script into index.html — no hand-edited HTML.
  // shuffleUntilPinned shows a random distinctive theme on each load until the
  // visitor pins one in the switcher.
  plugins: [react(), tailwindcss(), veneer({ shuffleUntilPinned: shufflePool })],
  // Force a single React instance regardless of the package manager's
  // node_modules layout (npm hoists, pnpm nests). Two Reacts => invalid hook call.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  preview: {
    port: 3002,
    allowedHosts: ['veneerui.dev'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
