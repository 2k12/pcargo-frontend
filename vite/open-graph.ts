import type { Logger, Plugin } from 'vite'

/** Marcador que `index.html` usa delante de las rutas de la vista previa (og:image, og:url…). */
export const MARCADOR_SITIO = '__SITE_URL__'

/**
 * WhatsApp, Facebook y X solo muestran la vista previa si `og:image` y `og:url` son URLs absolutas.
 * Sustituye el marcador por la URL pública del sitio (sin barra final). Sin URL, deja rutas relativas.
 */
export function absolutizarOpenGraph(html: string, sitio: string | undefined): string {
  const base = (sitio ?? '').trim().replace(/\/+$/, '')
  return html.replaceAll(MARCADOR_SITIO, base)
}

export function openGraph(sitio: string | undefined): Plugin {
  let esBuild = false
  let logger: Logger | undefined
  return {
    name: 'pcargo-open-graph',
    configResolved(config) {
      esBuild = config.command === 'build'
      logger = config.logger
    },
    transformIndexHtml(html) {
      if (esBuild && !sitio?.trim()) {
        logger?.warn(
          'VITE_SITE_URL no está definida: la vista previa al compartir el enlace (WhatsApp) no mostrará la imagen. ' +
            'Defínela con la URL pública, p. ej. VITE_SITE_URL=https://pcargo.ec',
        )
      }
      return absolutizarOpenGraph(html, sitio)
    },
  }
}
