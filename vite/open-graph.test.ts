import { describe, expect, it } from 'vitest'
import { absolutizarOpenGraph, MARCADOR_SITIO } from './open-graph.ts'

const html = `<meta property="og:image" content="${MARCADOR_SITIO}/og-pcargo.jpg" /><meta property="og:url" content="${MARCADOR_SITIO}/" />`

describe('absolutizarOpenGraph', () => {
  it('vuelve absolutas las URLs de la vista previa', () => {
    const r = absolutizarOpenGraph(html, 'https://pcargo.ec')
    expect(r).toContain('content="https://pcargo.ec/og-pcargo.jpg"')
    expect(r).toContain('content="https://pcargo.ec/"')
  })

  it('quita la barra final y los espacios de la URL del sitio', () => {
    expect(absolutizarOpenGraph(html, ' https://pcargo.ec/ ')).toContain('content="https://pcargo.ec/og-pcargo.jpg"')
  })

  it('sin URL del sitio deja rutas relativas', () => {
    const r = absolutizarOpenGraph(html, undefined)
    expect(r).toContain('content="/og-pcargo.jpg"')
    expect(r).not.toContain(MARCADOR_SITIO)
  })
})
