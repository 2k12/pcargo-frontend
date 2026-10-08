import { describe, expect, it } from 'vitest'
import { generarCatalogoAgentes, generarLlmsTxt, generarRobotsTxt, generarSitemap, RUTAS_LEGALES } from './agentic.ts'

// Mismas reglas que verifica Lighthouse 13.5 (audits llms-txt y ard-schema).
const URN = /^urn:air:([a-zA-Z0-9.-]+)(?::([a-zA-Z0-9._:-]+))?:([a-zA-Z0-9._-]+)$/

describe('llms.txt', () => {
  it('es Markdown con H1, enlaces y contenido suficiente', () => {
    const txt = generarLlmsTxt('https://pcargo.ec/')
    expect(txt).toMatch(/^\s*#\s+.+/m)
    expect(txt).toMatch(/\[.+\]\(.+\)/)
    expect(txt.length).toBeGreaterThan(50)
    expect(txt).toContain('(https://pcargo.ec/seguimiento)')
    expect(txt).not.toContain('//seguimiento')
  })

  it('sin URL pública usa rutas relativas', () => {
    expect(generarLlmsTxt(undefined)).toContain('](/seguimiento)')
  })
})

describe('robots.txt', () => {
  it('permite lo público, excluye el panel y solo usa directivas estándar', () => {
    const txt = generarRobotsTxt('https://pcargo.ec')
    expect(txt).toMatch(/^User-agent: \*$/m)
    expect(txt).toMatch(/^Disallow: \/panel$/m)
    // El validador de robots.txt de Lighthouse marca como error cualquier directiva no estándar.
    for (const linea of txt.split('\n').filter(Boolean)) expect(linea).toMatch(/^(User-agent|Allow|Disallow|Sitemap): /)
    expect(txt).toContain('Sitemap: https://pcargo.ec/sitemap.xml')
  })

  it('sin URL pública no anuncia sitemap (debe ser absoluto)', () => {
    expect(generarRobotsTxt(undefined)).not.toContain('Sitemap')
  })
})

describe('sitemap.xml', () => {
  it('lista solo las páginas públicas con URLs absolutas', () => {
    const xml = generarSitemap('https://pcargo.ec/')!
    expect(xml).toContain('<loc>https://pcargo.ec/</loc>')
    expect(xml).toContain('<loc>https://pcargo.ec/seguimiento</loc>')
    expect(xml).toContain('<loc>https://pcargo.ec/privacidad</loc>')
    expect(xml).toContain('<loc>https://pcargo.ec/pago-al-cobro</loc>')
    expect(xml).not.toContain('/panel')
    expect(generarSitemap(undefined)).toBeNull()
  })
})

describe('ai-catalog.json (ARD)', () => {
  it('cumple el esquema: specVersion, URN y url absoluta', () => {
    const c = JSON.parse(generarCatalogoAgentes('https://www.pcargo.ec'))
    expect(c.specVersion).toBe('1.0')
    expect(Object.keys(c).sort()).toEqual(['entries', 'host', 'specVersion'])
    const [e] = c.entries
    expect(e.identifier).toMatch(URN)
    expect(e.identifier).toContain('urn:air:pcargo.ec:')
    expect(e.url).toBe('https://www.pcargo.ec/llms.txt')
    expect(e.data).toBeUndefined()
    expect(e.representativeQueries.length).toBeGreaterThanOrEqual(2)
    expect(e.representativeQueries.length).toBeLessThanOrEqual(5)
  })

  it('sin URL pública embebe el resumen (exactamente uno de url/data)', () => {
    const [e] = JSON.parse(generarCatalogoAgentes(undefined)).entries
    expect(e.url).toBeUndefined()
    expect(e.data).toBeTypeOf('object')
    expect(e.identifier).toMatch(URN)
  })
})

describe('páginas legales', () => {
  it('coinciden con las rutas de la app y aparecen en llms.txt', () => {
    expect(RUTAS_LEGALES.map((l) => l.ruta)).toEqual(['/privacidad', '/terminos', '/pago-al-cobro', '/cookies'])
    const txt = generarLlmsTxt('https://pcargo.ec')
    for (const l of RUTAS_LEGALES) expect(txt).toContain(`(https://pcargo.ec${l.ruta})`)
  })
})
