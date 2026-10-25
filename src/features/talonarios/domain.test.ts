import { describe, expect, it } from 'vitest'
import {
  anularGuiaSchema,
  avisoGuiaTalonario,
  datosGuiaEnBlanco,
  diaTalonario,
  guiaParaRegistrar,
  nombreArchivoTalonario,
  numerosDe,
  numerosDisponibles,
  nuevoTalonarioSchema,
  rangoTalonario,
  resumenUso,
  segmentosUso,
} from './domain'

describe('talonarios — dominio (contrato v20)', () => {
  it('muestra el rango con el número impreso (7 dígitos)', () => {
    expect(rangoTalonario({ desde: 40500, hasta: 40509 })).toBe('0040500–0040509')
    expect(rangoTalonario({ desde: 40500, hasta: 40500 })).toBe('0040500')
  })

  it('la fecha mínima es el día de creación en Ecuador (UTC−5)', () => {
    // 03:00 UTC del 20 = 22:00 del 19 en Ecuador.
    expect(diaTalonario('2026-10-20T03:00:00.000Z')).toBe('2026-10-19')
    expect(diaTalonario('2026-10-20T15:00:00.000Z')).toBe('2026-10-20')
    expect(diaTalonario('no-es-fecha')).toBe('')
    expect(guiaParaRegistrar(40501, '2026-10-20T03:00:00.000Z')).toEqual({ numeroGuia: 40501, fechaMinima: '2026-10-19' })
  })

  it('lista todos los números y solo los disponibles para reimprimir', () => {
    expect(numerosDe({ desde: 10, hasta: 13 })).toEqual([10, 11, 12, 13])
    const guias = [
      { numeroGuia: 10, estado: 'USADA' },
      { numeroGuia: 11, estado: 'DISPONIBLE' },
      { numeroGuia: 12, estado: 'ANULADA' },
      { numeroGuia: 13, estado: 'DISPONIBLE' },
    ] as const
    expect(numerosDisponibles({ guias: guias.map((g) => ({ ...g, envioId: null, motivo: null, actualizadoEn: null })) })).toEqual([11, 13])
  })

  it('resume el uso y arma la barra (suma 100 %)', () => {
    const t = { cantidad: 10, disponibles: 6, usadas: 3, anuladas: 1 }
    expect(resumenUso(t)).toBe('6 disponibles · 3 registradas · 1 anulada')
    expect(resumenUso({ disponibles: 1, usadas: 0, anuladas: 0 })).toBe('1 disponible')
    const seg = segmentosUso(t)
    expect(seg.map((s) => s.estado)).toEqual(['USADA', 'ANULADA', 'DISPONIBLE'])
    expect(seg.reduce((a, s) => a + s.porcentaje, 0)).toBeCloseTo(100)
    expect(segmentosUso({ cantidad: 0, disponibles: 0, usadas: 0, anuladas: 0 })).toEqual([])
  })

  it('explica al operador qué pasa con un número de talonario escaneado', () => {
    expect(avisoGuiaTalonario({ numeroGuia: 40501, estado: 'DISPONIBLE', motivo: null })).toMatch(/0040501 es de un talonario y todavía no está registrada/)
    expect(avisoGuiaTalonario({ numeroGuia: 40502, estado: 'ANULADA', motivo: 'Se mojó' })).toBe('La guía 0040502 está anulada: Se mojó')
    expect(avisoGuiaTalonario({ numeroGuia: 40503, estado: 'USADA', motivo: null })).toBe('La guía 0040503 ya está registrada.')
  })

  it('valida cantidad 1–50 y nota ≤ 120; motivo de anulación 3–200', () => {
    expect(nuevoTalonarioSchema.safeParse({ cantidad: 10 }).success).toBe(true)
    expect(nuevoTalonarioSchema.safeParse({ cantidad: 0 }).success).toBe(false)
    expect(nuevoTalonarioSchema.safeParse({ cantidad: 51 }).success).toBe(false)
    expect(nuevoTalonarioSchema.safeParse({ cantidad: 2.5 }).success).toBe(false)
    expect(nuevoTalonarioSchema.safeParse({ cantidad: Number.NaN }).success).toBe(false)
    expect(nuevoTalonarioSchema.safeParse({ cantidad: 5, nota: 'x'.repeat(121) }).success).toBe(false)
    expect(anularGuiaSchema.safeParse({ motivo: ' ab ' }).success).toBe(false)
    expect(anularGuiaSchema.safeParse({ motivo: 'Rota' }).success).toBe(true)
    expect(anularGuiaSchema.safeParse({ motivo: 'x'.repeat(201) }).success).toBe(false)
  })

  it('cada guía en blanco lleva la misma URL de seguimiento que una guía normal y la marca del talonario', () => {
    expect(datosGuiaEnBlanco(40501, ' Camión Quito ', 'https://pcargo.ec/')).toEqual({
      numeroGuia: 40501,
      numero: '0040501',
      urlSeguimiento: 'https://pcargo.ec/seguimiento/40501',
      urlTerminos: 'https://pcargo.ec/terminos',
      marca: 'TALONARIO · Camión Quito',
    })
    expect(datosGuiaEnBlanco(40501, null, 'https://pcargo.ec').marca).toBe('TALONARIO')
    expect(nombreArchivoTalonario([40503, 40501])).toBe('talonario-0040501-0040503.pdf')
    expect(nombreArchivoTalonario([40501])).toBe('talonario-0040501.pdf')
  })
})
