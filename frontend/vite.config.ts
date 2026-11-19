import fs from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

/**
 * Stamps a build id into the copied `dist/sw.js`, so every deploy ships a new
 * cache name and the old caches are dropped on activate.
 */
function serviceWorkerVersion(): Plugin {
  return {
    name: 'pootd-sw-version',
    apply: 'build',
    closeBundle() {
      const file = path.resolve(import.meta.dirname, 'dist/sw.js')
      if (!fs.existsSync(file)) return

      const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
      const source = fs.readFileSync(file, 'utf8')
      fs.writeFileSync(file, source.replaceAll('__POOTD_VERSION__', stamp))
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorkerVersion()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
