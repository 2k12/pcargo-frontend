/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { agentic } from './vite/agentic.ts'
import { openGraph } from './vite/open-graph.ts'
import { precargaFuente } from './vite/precarga-fuente.ts'

export default defineConfig(({ mode }) => {
  const sitio = loadEnv(mode, process.cwd()).VITE_SITE_URL
  // Versión de la app (package.json) y commit desplegado (Railway lo entrega al compilar) para mostrarlos en el login.
  const { version } = JSON.parse(readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf8')) as { version: string }
  const commit = (process.env.RAILWAY_GIT_COMMIT_SHA ?? '').slice(0, 7)
  return {
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __APP_COMMIT__: JSON.stringify(commit),
    },
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
