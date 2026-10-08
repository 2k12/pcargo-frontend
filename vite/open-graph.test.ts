import { describe, expect, it } from 'vitest'
import { absolutizarOpenGraph, MARCADOR_SITIO } from './open-graph.ts'

const html = [
  `    <link rel="canonical" href="${MARCADOR_SITIO}/" />`,
  `    <meta property="og:url" content="${MARCADOR_SITIO}/" />`,
  `    <meta property="og:image" content="${MARCADOR_SITIO}/og-pcargo.jpg" />`,
  '',
].join('\n')

describe('absolutizarOpenGraph', () => {
  it('vuelve absolutas las URLs de la vista previa y conserva canonical y og:url', () => {
    const r = absolutizarOpenGraph(html, 'https://pcargo.ec')
    expect(r).toContain('<link rel="canonical" href="https://pcargo.ec/" />')
    expect(r).toContain('<meta property="og:url" content="https://pcargo.ec/" />')
    expect(r).toContain('content="https://pcargo.ec/og-pcargo.jpg"')
  })

  it('quita la barra final y los espacios de la URL del sitio', () => {
    expect(absolutizarOpenGraph(html, ' https://pcargo.ec/ ')).toContain('content="https://pcargo.ec/og-pcargo.jpg"')
  })

  it('sin URL del sitio quita canonical y og:url y deja relativa la imagen', () => {
    for (const sitio of [undefined, '', '  ']) {
      expect(absolutizarOpenGraph(html, sitio)).toBe('    <meta property="og:image" content="/og-pcargo.jpg" />\n')
    }
  })

  it('también funciona con saltos de línea de Windows', () => {
    expect(absolutizarOpenGraph(html.replaceAll('\n', '\r\n'), undefined)).toBe(
      '    <meta property="og:image" content="/og-pcargo.jpg" />\r\n',
    )
  })
})
