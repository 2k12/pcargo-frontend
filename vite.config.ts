/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { agentic } from './vite/agentic.ts'
import { openGraph } from './vite/open-graph.ts'
import { precargaFuente } from './vite/precarga-fuente.ts'

export default defineConfig(({ mode }) => {
  const sitio = loadEnv(mode, process.cwd()).VITE_SITE_URL
  return {
    plugins: [react(), tailwindcss(), openGraph(sitio), agentic(sitio), precargaFuente()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    server: {
      port: 5173,
      proxy: { '/api': 'http://localhost:3000' },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
