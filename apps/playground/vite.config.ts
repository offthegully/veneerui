/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { veneer } from '@offthegully/veneerui/vite'
import { APP_FIRST_VISIT_THEME_IDS } from './src/theme-ids'

// Read each shuffle candidate's tokens straight off disk (every id in the pool is
// a gallery theme) so the anti-flash plugin can inline them and apply a random one
// before first paint. themes.ts is the runtime source of truth; this touches the
// same on-disk JSON, and theme-ids.ts keeps the id lists in sync.
const shufflePool = APP_FIRST_VISIT_THEME_IDS.map((id) => {
  const url = new URL(`../../gallery/themes/${id}/theme.json`, import.meta.url)
  const { tokens } = JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as {
    tokens: Record<string, string>
  }
  return { id, tokens }
})

// https://vite.dev/config/
export default defineConfig({
  // veneer() injects the anti-flash script into index.html — no hand-edited HTML.
  // shuffleUntilPinned shows a random distinctive theme on each load until the
  // visitor pins one in the switcher.
  plugins: [react(), tailwindcss(), veneer({ shuffleUntilPinned: shufflePool })],
  preview: {
    port: 3002,
    allowedHosts: ['veneerui.dev'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
