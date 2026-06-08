import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { veneer } from '@offthegully/veneerui/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [veneer(), tailwindcss(), react()],
})
