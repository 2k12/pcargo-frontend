import { describe, expect, it } from 'vitest'
import { esTextoGuia, etiquetaGuia, normalizarGuia } from './guia'

describe('número de guía', () => {
  it.each([
    ['0040425', '40425'],
    ['40425', '40425'],
    [' 00 40 425 ', '40425'],
    ['000999999999999', '999999999999'],
  ])('%j → %s (ignora ceros a la izquierda y espacios)', (entrada, esperado) => {
    expect(normalizarGuia(entrada)).toBe(esperado)
  })

  it.each(['', '   ', '0000', 'PC-7K2M9QXA', '40-425', '4.5', '1234567890123'])('rechaza %j', (entrada) => {
    expect(normalizarGuia(entrada)).toBeNull()
  })

  it('detecta textos numéricos y arma la etiqueta', () => {
    expect(esTextoGuia('0040425')).toBe(true)
    expect(esTextoGuia('Rosa')).toBe(false)
    expect(etiquetaGuia(40425)).toBe('Guía 40425')
  })
})
