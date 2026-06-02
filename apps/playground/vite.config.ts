/// <reference types="vitest/config" />
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { veneer } from '@offthegully/veneerui/vite'

// Every gallery theme is a first-visit shuffle candidate. Enumerate the gallery
// directory off disk and read each theme's tokens, so the anti-flash plugin can
// inline them and apply a random one before first paint. themes.ts is the runtime
// source of truth; it globs the *same* directory (APP_SHUFFLE_THEME_IDS), so the
// two pools always see the same set — a new theme.json joins both with no wiring.
const galleryDir = fileURLToPath(new URL('../../gallery/themes/', import.meta.url))
const shufflePool = readdirSync(galleryDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const url = new URL(`../../gallery/themes/${entry.name}/theme.json`, import.meta.url)
    const { tokens } = JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as {
      tokens: Record<string, string>
    }
    return { id: entry.name, tokens }
  })

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
