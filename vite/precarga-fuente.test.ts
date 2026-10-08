import { describe, expect, it } from 'vitest'
import { etiquetaPrecarga, PATRON_FUENTE } from './precarga-fuente.ts'

describe('precarga de la fuente', () => {
  it('reconoce el archivo de Geist con hash y genera un preload con crossorigin', () => {
    expect(PATRON_FUENTE.test('assets/geist-latin-wght-normal-BgDaEnEv.woff2')).toBe(true)
    expect(PATRON_FUENTE.test('assets/geist-latin-ext-wght-normal-x.woff2')).toBe(false)
    const t = etiquetaPrecarga('/', 'assets/geist-latin-wght-normal-BgDaEnEv.woff2')
    expect(t.attrs).toEqual({
      rel: 'preload',
      href: '/assets/geist-latin-wght-normal-BgDaEnEv.woff2',
      as: 'font',
      type: 'font/woff2',
      crossorigin: '',
    })
  })
})
