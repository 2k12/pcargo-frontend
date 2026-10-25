import { describe, expect, it } from 'vitest'
import { fechaCorta, fechaGuiaDe, fechaGuiaDistinta, fechaLarga, hoyEC, rangoFechaGuia, sumarDias, validarFechaGuia } from './fechaGuia'

// 23/10/2026 02:00 UTC = 22/10/2026 21:00 en Ecuador (UTC−5).
const AHORA = Date.parse('2026-10-23T02:00:00Z')

describe('fecha de la guía (contrato v18)', () => {
  it('hoy es el día de Ecuador y el rango llega a hoy + 90', () => {
    expect(hoyEC(AHORA)).toBe('2026-10-22')
    expect(rangoFechaGuia(AHORA)).toEqual({ min: '2026-10-22', max: '2027-01-20' })
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('valida igual que el servidor: hoy..hoy+90; vacío es hoy', () => {
    expect(validarFechaGuia(undefined, AHORA)).toBeNull()
    expect(validarFechaGuia('', AHORA)).toBeNull()
    expect(validarFechaGuia('2026-10-22', AHORA)).toBeNull()
    expect(validarFechaGuia('2027-01-20', AHORA)).toBeNull()
    expect(validarFechaGuia('2026-10-21', AHORA)).toBe('La fecha de la guía no puede ser anterior a hoy')
    expect(validarFechaGuia('2027-01-21', AHORA)).toMatch(/como máximo 90 días/)
    expect(validarFechaGuia('2026-13-01', AHORA)).toBe('Fecha inválida')
  })

  it('guía de talonario (v20): acepta desde el día del talonario; un mínimo futuro o inválido no cambia nada', () => {
    expect(rangoFechaGuia(AHORA, '2026-10-15')).toEqual({ min: '2026-10-15', max: '2027-01-20' })
    expect(validarFechaGuia('2026-10-15', AHORA, '2026-10-15')).toBeNull()
    expect(validarFechaGuia('2026-10-18', AHORA, '2026-10-15')).toBeNull()
    expect(validarFechaGuia('2026-10-14', AHORA, '2026-10-15')).toBe('La fecha de la guía no puede ser anterior al día del talonario (15/10/2026)')
    expect(rangoFechaGuia(AHORA, '2026-10-30').min).toBe('2026-10-22')
    expect(rangoFechaGuia(AHORA, 'x').min).toBe('2026-10-22')
    expect(validarFechaGuia('2026-10-21', AHORA, null)).toBe('La fecha de la guía no puede ser anterior a hoy')
  })

  it('usa fechaGuia y, si falta, el día de registro en Ecuador', () => {
    const registro = { fecha: '2026-10-08T03:24:55.786Z', operador: null }
    expect(fechaGuiaDe({ registro, fechaGuia: '2026-10-15' })).toBe('2026-10-15')
    expect(fechaGuiaDe({ registro })).toBe('2026-10-07')
    expect(fechaGuiaDe({ registro, fechaGuia: null })).toBe('2026-10-07')
    expect(fechaGuiaDistinta({ registro, fechaGuia: '2026-10-15' })).toBe(true)
    expect(fechaGuiaDistinta({ registro, fechaGuia: '2026-10-07' })).toBe(false)
    expect(fechaGuiaDistinta({ registro })).toBe(false)
  })

  it('formatea la fecha corta y larga', () => {
    expect(fechaCorta('2026-10-15')).toBe('15/10/2026')
    expect(fechaCorta('x')).toBe('')
    expect(fechaLarga('2026-10-20')).toBe('martes, 20 de octubre de 2026')
  })
})
