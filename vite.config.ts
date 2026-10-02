import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Vite 8 defaults to Safari/iOS 16.4+. Lower the syntax target so
    // older mobile Safari/Chrome versions can execute the production bundle.
    target: 'es2018',
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
})
