import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

/**
 * Archivos para agentes de IA y buscadores (Lighthouse › Agentic Browsing y SEO):
 * - `/llms.txt`: guía en Markdown del sitio (https://llmstxt.org).
 * - `/sitemap.xml`: páginas públicas (solo con URL pública).
 * - `/robots.txt`: indexa lo público y excluye el panel. (No usa `Agentmap:`: el validador SEO de Lighthouse
 *   lo marca como directiva desconocida; el catálogo se anuncia con `<link rel="ai-catalog">` en index.html.)
 * - `/.well-known/ai-catalog.json`: catálogo ARD (Agentic Resource Discovery) que apunta a `llms.txt`.
 *
 * Se generan en el build con la URL pública (`VITE_SITE_URL`) porque el catálogo exige URLs absolutas.
 * Existen como archivos reales: si faltaran, el fallback de la SPA devolvería `index.html` con 200 y
 * Lighthouse lo daría por un catálogo/llms.txt inválido.
 */

export const RUTA_CATALOGO = '/.well-known/ai-catalog.json'

/** Herramientas WebMCP que registra el sitio (ver src/lib/webmcp.ts). */
export const HERRAMIENTAS_WEBMCP = [
  { nombre: 'rastrear_envio', descripcion: 'Consulta el estado y el historial de una encomienda por su número de guía.' },
  { nombre: 'cotizar_envio', descripcion: 'Calcula el precio de un envío entre dos ciudades de cobertura.' },
  { nombre: 'consultar_cobertura', descripcion: 'Lista ciudades, rutas con tarifa base y tiempo estimado, y tipos de carga.' },
] as const

const limpiar = (sitio: string | undefined) => (sitio ?? '').trim().replace(/\/+$/, '')

/** `pcargo.ec` a partir de la URL pública; `pcargo` si no hay URL válida. */
function publicador(sitio: string): string {
  try {
    return new URL(sitio).hostname.replace(/^www\./, '') || 'pcargo'
  } catch {
    return 'pcargo'
  }
}

export function generarLlmsTxt(sitioUrl: string | undefined): string {
  const s = limpiar(sitioUrl)
  return `# PCargo

> Servicio de encomiendas a domicilio con base en Ibarra, Ecuador. Transporta sobres, paquetes, cartones y valijas
> entre Ibarra, Atuntaqui, Otavalo y Quito (urbano e interurbano, ambos sentidos), con precio calculado por sistema
> y seguimiento en línea por número de guía.

- Moneda: USD. Idioma: español (Ecuador).
- El número de guía es solo numérico; los ceros a la izquierda no cuentan (0040425 = 40425).
- Precio = tarifa base de la ruta × factor del tipo de carga + $0,50 por cada kg sobre el peso incluido.

## Páginas

- [Inicio](${s}/): servicios, cómo funciona, cobertura, tarifas y contacto.
- [Cotizar un envío](${s}/#cotizar): calcula el precio por origen, destino, tipo de carga, cantidad y peso.
- [Cobertura y tarifas](${s}/#cobertura): matriz de tarifas base y tiempos estimados por trayecto.
- [Rastrear una encomienda](${s}/seguimiento): estado e historial con el número de guía (\`${s}/seguimiento/{numeroGuia}\`).
- [Contacto](${s}/#contacto): oficina en Las Gardenias s/n y El Rosal (La Florida), Ibarra · 06 263 2669 · WhatsApp +593 99 518 7551.

## API pública (JSON, sin autenticación, 60 solicitudes/min por IP)

- [Catálogo](${s}/api/publico/catalogo): \`GET\` ciudades activas, rutas operativas (tarifa base y tiempo) y tipos de carga.
- [Cotizar](${s}/api/publico/cotizar): \`POST\` con \`{ "rutaId": number, "items": [{ "tipoCarga": "SOBRE"|"PAQUETE"|"CARTON"|"VALIJA", "cantidad": number, "pesoKg": number }] }\`.
- [Seguimiento](${s}/api/seguimiento/40425): \`GET /api/seguimiento/{numeroGuia}\` devuelve estado, ruta, ítems e historial.

## Herramientas para agentes (WebMCP)

${HERRAMIENTAS_WEBMCP.map((h) => `- \`${h.nombre}\`: ${h.descripcion}`).join('\n')}

## Opcional

- [Catálogo de recursos para agentes](${s}${RUTA_CATALOGO})
- El panel de operaciones (\`/panel\`, \`/envios\`, \`/rutas\`) es privado y requiere sesión.
`
}

export function generarRobotsTxt(sitioUrl: string | undefined): string {
  const s = limpiar(sitioUrl)
  return `User-agent: *
Allow: /
Disallow: /panel
Disallow: /envios
Disallow: /rutas
Disallow: /login
${s ? `\nSitemap: ${s}/sitemap.xml\n` : ''}`
}

/** Páginas públicas indexables. Sin URL pública no se genera (el protocolo exige URLs absolutas). */
export function generarSitemap(sitioUrl: string | undefined): string | null {
  const s = limpiar(sitioUrl)
  if (!s) return null
  const urls = ['/', '/seguimiento'].map((r) => `  <url><loc>${s}${r}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

/** Catálogo ARD. Con URL pública referencia `llms.txt`; sin ella lo resume embebido (`data`), pues `url` debe ser absoluta. */
export function generarCatalogoAgentes(sitioUrl: string | undefined): string {
  const s = limpiar(sitioUrl)
  const entrada = {
    identifier: `urn:air:${publicador(s)}:sitio:guia-encomiendas`,
    displayName: 'PCargo · rastrear y cotizar encomiendas',
    type: 'text/markdown; profile="urn:air:agent-skills"',
    description:
      'Cómo rastrear una encomienda por número de guía, cotizar envíos entre Ibarra, Atuntaqui, Otavalo y Quito y ' +
      'consultar cobertura y tarifas de PCargo (web, API pública y herramientas WebMCP).',
    tags: ['encomiendas', 'courier', 'ecuador', 'ibarra', 'seguimiento', 'cotizacion'],
    capabilities: HERRAMIENTAS_WEBMCP.map((h) => h.nombre),
    representativeQueries: [
      'dónde está mi encomienda con guía 40425',
      'cuánto cuesta enviar un paquete de Ibarra a Quito',
      'a qué ciudades entrega PCargo',
      'tarifa de un sobre de Otavalo a Atuntaqui',
    ],
    ...(s ? { url: `${s}/llms.txt` } : { data: { guia: '/llms.txt', herramientasWebMCP: HERRAMIENTAS_WEBMCP } }),
  }
  return `${JSON.stringify({ specVersion: '1.0', host: { displayName: 'PCargo' }, entries: [entrada] }, null, 2)}\n`
}

const ARCHIVOS = (sitio: string | undefined) => [
  { ruta: '/llms.txt', tipo: 'text/markdown; charset=utf-8', contenido: generarLlmsTxt(sitio) },
  { ruta: '/robots.txt', tipo: 'text/plain; charset=utf-8', contenido: generarRobotsTxt(sitio) },
  { ruta: RUTA_CATALOGO, tipo: 'application/json; charset=utf-8', contenido: generarCatalogoAgentes(sitio) },
  ...(generarSitemap(sitio) ? [{ ruta: '/sitemap.xml', tipo: 'application/xml; charset=utf-8', contenido: generarSitemap(sitio)! }] : []),
]

type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => void

/** Sirve los archivos en dev/preview con el origen de la petición si no hay URL pública
 * (en preview, además, el servidor estático no expone carpetas con punto como `.well-known`). */
const servir =
  (sitio: string | undefined): Middleware =>
  (req, res, next) => {
    const ruta = req.url?.split('?')[0]
    const base = sitio?.trim() || `http://${req.headers.host}`
    const archivo = ARCHIVOS(base).find((a) => a.ruta === ruta)
    if (!archivo) return next()
    res.setHeader('Content-Type', archivo.tipo)
    res.end(archivo.contenido)
  }

export function agentic(sitio: string | undefined): Plugin {
  return {
    name: 'pcargo-agentic',
    configureServer(server) {
      server.middlewares.use(servir(sitio))
    },
    configurePreviewServer(server) {
      server.middlewares.use(servir(sitio))
    },
    generateBundle() {
      for (const a of ARCHIVOS(sitio)) {
        this.emitFile({ type: 'asset', fileName: a.ruta.slice(1), source: a.contenido })
      }
    },
  }
}
