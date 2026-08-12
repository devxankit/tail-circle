import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { offlinePWA } from './pwa/vite-plugin-offline'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    // Generates dist/sw.js with a precache list read off the real bundle.
    offlinePWA()
  ]
})
