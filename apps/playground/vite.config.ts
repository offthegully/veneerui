/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { veneer } from '@offthegully/veneerui/vite'

// https://vite.dev/config/
export default defineConfig({
  // veneer() injects the anti-flash script into index.html (no hand-edited HTML),
  // so a returning visitor's saved theme applies before first paint.
  plugins: [react(), tailwindcss(), veneer()],
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
