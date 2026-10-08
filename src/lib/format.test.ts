import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDateTime, formatDuracion, formatPeso, iniciales } from './format'

describe('formatCurrency', () => {
  it('formatea en USD con coma decimal (es-EC)', () => {
    const s = formatCurrency(2.5)
    expect(s).toContain('$')
    expect(s).toMatch(/2,50/)
  })

  it('redondea a dos decimales', () => {
    expect(formatCurrency(6.456)).toMatch(/6,46/)
  })
})

describe('formatDateTime', () => {
  it('devuelve guion con fechas inválidas', () => {
    expect(formatDateTime('no-es-fecha')).toBe('—')
  })

  it('formatea una fecha ISO válida', () => {
    expect(formatDateTime('2026-10-07T15:30:00Z')).toMatch(/2026/)
  })
})

describe('formatDuracion', () => {
  it.each([
    [45, '45 min'],
    [60, '1 h'],
    [150, '2 h 30 min'],
  ])('%i min → %s', (min, esperado) => {
    expect(formatDuracion(min)).toBe(esperado)
  })
})

describe('otros formatos', () => {
  it('formatPeso agrega unidad', () => {
    expect(formatPeso(2.5)).toBe('2,5 kg')
  })

  it('iniciales toma hasta dos palabras', () => {
    expect(iniciales('María José Pérez')).toBe('MJ')
    expect(iniciales('admin')).toBe('A')
  })
})
