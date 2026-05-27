/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { veneer } from '@veneer/theme/vite'

// https://vite.dev/config/
export default defineConfig({
  // veneer() injects the anti-flash script into index.html — no hand-edited HTML.
  plugins: [react(), tailwindcss(), veneer()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
