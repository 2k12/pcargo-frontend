import type { Logger, Plugin } from 'vite'

/** Marcador que `index.html` usa delante de las rutas de la vista previa (og:image, og:url…). */
export const MARCADOR_SITIO = '__SITE_URL__'

// Etiquetas que solo tienen sentido con URL absoluta: un canonical u og:url relativo es inválido (Lighthouse).
const SOLO_ABSOLUTAS = /^[ \t]*<(?:link[^>]*rel="canonical"|meta[^>]*property="og:url")[^>]*__SITE_URL__[^>]*>[ \t]*\r?\n?/gm

/**
 * WhatsApp, Facebook y X solo muestran la vista previa si `og:image` y `og:url` son URLs absolutas.
 * Sustituye el marcador por la URL pública del sitio (sin barra final). Sin URL, quita canonical y og:url
 * y deja relativas el resto de rutas (la imagen sigue sirviendo en el propio dominio).
 */
export function absolutizarOpenGraph(html: string, sitio: string | undefined): string {
  const base = (sitio ?? '').trim().replace(/\/+$/, '')
  const limpio = base ? html : html.replace(SOLO_ABSOLUTAS, '')
  return limpio.replaceAll(MARCADOR_SITIO, base)
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
