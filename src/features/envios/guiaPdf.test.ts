import { afterEach, describe, expect, it } from 'vitest'
import {
  ALTO_GUIA,
  ANCHO_TALON,
  guardarPosicionGuia,
  GUIAS_POR_HOJA,
  leerPosicionGuia,
  nombreArchivoGuias,
  ordenarParaImprimir,
  POSICIONES_HOJA,
  posicionGuia,
  ubicacionGuia,
  X_TALON,
} from './guiaPdf'

describe('cuatro talones por hoja', () => {
  it('caben cuatro guías por hoja A4, sin solaparse y con margen al borde', () => {
    expect(GUIAS_POR_HOJA).toBe(4)
    const ys = POSICIONES_HOJA.map(posicionGuia)
    expect(ys[0]).toBeGreaterThanOrEqual(5)
    expect(ys[3]! + ALTO_GUIA).toBeLessThanOrEqual(297 - 5)
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1]! + ALTO_GUIA + 4)
  })

  it('solo va el talón, a lo ancho de la hoja con margen a los lados', () => {
    expect(X_TALON).toBeGreaterThanOrEqual(5)
    expect(X_TALON + ANCHO_TALON).toBeLessThanOrEqual(210 - 5)
    expect(ANCHO_TALON).toBeGreaterThan(190)
  })
})

describe('posición en la hoja recordada', () => {
  afterEach(() => localStorage.clear())

  it('por defecto es la primera (arriba) y recuerda la última elegida', () => {
    expect(leerPosicionGuia()).toBe(0)
    guardarPosicionGuia(2)
    expect(leerPosicionGuia()).toBe(2)
  })

  it('ignora valores guardados que no son una posición (p. ej. la «mitad» del formato anterior)', () => {
    localStorage.setItem('pcargo.guia.posicion', 'inferior')
    expect(leerPosicionGuia()).toBe(0)
    localStorage.setItem('pcargo.guia.posicion', '7')
    expect(leerPosicionGuia()).toBe(0)
  })
})

describe('varias guías en un PDF', () => {
  it('van cuatro por hoja, de arriba abajo, y la quinta en otra hoja', () => {
    expect([0, 1, 2, 3, 4, 5].map(ubicacionGuia)).toEqual([
      { hoja: 0, posicion: 0 },
      { hoja: 0, posicion: 1 },
      { hoja: 0, posicion: 2 },
      { hoja: 0, posicion: 3 },
      { hoja: 1, posicion: 0 },
      { hoja: 1, posicion: 1 },
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
