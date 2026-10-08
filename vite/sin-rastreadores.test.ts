import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * La política de cookies afirma que el sitio no usa cookies ni analítica ni widgets incrustados, y por eso no pide
 * consentimiento. Este test lo vigila: si alguien agrega un rastreador, falla y obliga a revisar la política y el aviso.
 */
const RASTREADORES = /googletagmanager|google-analytics|gtag\(|fbq\(|connect\.facebook|hotjar|clarity\.ms|plausible|umami|posthog|segment\.com|<iframe|document\.cookie/i

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n)
    return statSync(ruta).isDirectory() ? archivos(ruta) : /\.(tsx?|html|css)$/.test(n) && !/\.test\./.test(n) ? [ruta] : []
  })
}

describe('sin rastreadores (política de cookies)', () => {
  it('index.html no carga scripts ni estilos de terceros', () => {
    const html = readFileSync('index.html', 'utf8')
    expect(html).not.toMatch(/<script[^>]+src=["']https?:/i)
    expect(html).not.toMatch(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']https?:/i)
    expect(html).not.toMatch(RASTREADORES)
  })

  it('el código del sitio no usa cookies, analítica ni iframes', () => {
    const conRastreo = archivos('src').filter((f) => RASTREADORES.test(readFileSync(f, 'utf8')))
    expect(conRastreo).toEqual([])
  })
})
