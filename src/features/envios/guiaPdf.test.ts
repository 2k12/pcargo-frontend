import { afterEach, describe, expect, it } from 'vitest'
import {
  ALTO_COPIA,
  guardarMitadGuia,
  leerMitadGuia,
  nombreArchivoGuias,
  ordenarParaImprimir,
  posicionCopias,
  ubicacionGuia,
} from './guiaPdf'

const MITAD_A4 = 297 / 2

describe('posicionCopias', () => {
  it.each(['superior', 'inferior'] as const)('las dos copias caben en la mitad %s, con margen al borde de la hoja', (mitad) => {
    const [y0, y1] = posicionCopias(mitad)
    const desde = mitad === 'superior' ? 0 : MITAD_A4
    expect(y0).toBeGreaterThanOrEqual(desde + 2)
    expect(y1).toBeGreaterThanOrEqual(y0 + ALTO_COPIA)
    expect(y1 + ALTO_COPIA).toBeLessThanOrEqual(desde + MITAD_A4 - 2)
    if (mitad === 'superior') expect(y0).toBeGreaterThanOrEqual(5)
    else expect(y1 + ALTO_COPIA).toBeLessThanOrEqual(297 - 5)
  })
})

describe('mitad de la hoja recordada', () => {
  afterEach(() => localStorage.clear())

  it('por defecto es la superior y recuerda la última elegida', () => {
    expect(leerMitadGuia()).toBe('superior')
    guardarMitadGuia('inferior')
    expect(leerMitadGuia()).toBe('inferior')
  })
})

describe('varias guías en un PDF', () => {
  it('van dos por hoja: arriba y abajo, y la siguiente en otra hoja', () => {
    expect([0, 1, 2, 3, 4].map(ubicacionGuia)).toEqual([
      { hoja: 0, mitad: 'superior' },
      { hoja: 0, mitad: 'inferior' },
      { hoja: 1, mitad: 'superior' },
      { hoja: 1, mitad: 'inferior' },
      { hoja: 2, mitad: 'superior' },
    ])
  })

  it('se ordenan por número de guía y el archivo lleva el rango', () => {
    expect(ordenarParaImprimir([{ numeroGuia: 40462 }, { numeroGuia: 40460 }, { numeroGuia: 40461 }]).map((e) => e.numeroGuia)).toEqual([
      40460, 40461, 40462,
    ])
    expect(nombreArchivoGuias([{ numero: '0040460', nombreArchivo: 'guia-0040460.pdf' }])).toBe('guia-0040460.pdf')
    expect(
      nombreArchivoGuias([
        { numero: '0040460', nombreArchivo: 'guia-0040460.pdf' },
        { numero: '0040462', nombreArchivo: 'guia-0040462.pdf' },
      ]),
    ).toBe('guias-0040460-0040462.pdf')
  })
})
