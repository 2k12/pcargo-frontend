import type { Plugin } from 'vite'

/**
 * Precarga la fuente variable Geist (latin) desde el HTML. Sin esto el navegador la descubre recién al
 * procesar el CSS (HTML → CSS → woff2), lo que retrasa el primer pintado del texto en móviles.
 * El nombre del archivo lleva hash, por eso se resuelve en el build a partir del bundle.
 */
export const PATRON_FUENTE = /geist-latin-wght-normal-[\w-]+\.woff2$/

export function etiquetaPrecarga(base: string, archivo: string) {
  return { tag: 'link', attrs: { rel: 'preload', href: `${base}${archivo}`, as: 'font', type: 'font/woff2', crossorigin: '' }, injectTo: 'head' as const }
}

export function precargaFuente(): Plugin {
  let base = '/'
  return {
    name: 'pcargo-precarga-fuente',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml(_html, ctx) {
      const archivo = Object.keys(ctx.bundle ?? {}).find((f) => PATRON_FUENTE.test(f))
      return archivo ? [etiquetaPrecarga(base, archivo)] : []
    },
  }
}
