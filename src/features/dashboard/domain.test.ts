import { describe, expect, it } from 'vitest'
import type { Estado } from '@/types/api'
import { ESTADOS } from '@/features/envios/domain'
import { enCamino, GRUPOS_ESTADO, requierenAtencion, segmentosEstado, tasaEntrega, ticketPromedio, totalGrupo } from './domain'

const porEstado = (p: Partial<Record<Estado, number>>) => p as Record<Estado, number>

describe('dashboard/domain', () => {
  const r = {
    totalEnvios: 10,
    ingresos: 36,
    porEstado: porEstado({ REGISTRADO: 1, EN_TRANSITO: 2, EN_REPARTO: 1, ENTREGADO: 3, NO_ENTREGADO: 1, NOVEDAD: 1, CANCELADO: 1 }),
  }

  it('los grupos cubren cada estado exactamente una vez', () => {
    const agrupados = GRUPOS_ESTADO.flatMap((g) => g.estados)
    expect([...agrupados].sort()).toEqual([...ESTADOS].sort())
    expect(totalGrupo(r, GRUPOS_ESTADO[1]!.estados)).toBe(2)
  })

  it('calcula segmentos por estado con porcentaje, en el orden de los grupos', () => {
    const s = segmentosEstado(r)
    expect(s.map((x) => x.estado)[0]).toBe('REGISTRADO')
    expect(s.find((x) => x.estado === 'ENTREGADO')).toEqual({ estado: 'ENTREGADO', total: 3, pct: 30 })
    expect(s.reduce((a, x) => a + x.pct, 0)).toBeCloseTo(100)
  })

  it('segmentos con total 0 no dividen por cero', () => {
    expect(segmentosEstado({ totalEnvios: 0, porEstado: porEstado({}) }).every((x) => x.pct === 0)).toBe(true)
  })

  it('agrupa en camino y requieren atención', () => {
    expect(enCamino(r)).toBe(3)
    expect(requierenAtencion(r)).toBe(2)
  })

  it('tasa de entrega sobre envíos cerrados', () => {
    expect(tasaEntrega(r)).toBe(75)
    expect(tasaEntrega({ porEstado: porEstado({ REGISTRADO: 4 }) })).toBeNull()
  })

  it('ticket promedio excluye cancelados', () => {
    expect(ticketPromedio(r)).toBe(4)
    expect(ticketPromedio({ totalEnvios: 0, ingresos: 0, porEstado: porEstado({}) })).toBe(0)
  })
})
