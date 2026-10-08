import { describe, expect, it } from 'vitest'
import type { Estado } from '@/types/api'
import { esEstadoFinal, puedeTransicionar, transicionesPermitidas } from './domain'
import { crearEnvioSchema } from './schema'
import { TIPOS_CARGA_DEFAULT } from './domain'

describe('transicionesPermitidas', () => {
  it.each<[Estado, Estado[]]>([
    ['REGISTRADO', ['EN_TRANSITO', 'CANCELADO']],
    ['EN_TRANSITO', ['EN_REPARTO']],
    ['EN_REPARTO', ['ENTREGADO']],
    ['ENTREGADO', []],
    ['CANCELADO', []],
  ])('%s → %j', (estado, esperado) => {
    expect(transicionesPermitidas(estado)).toEqual(esperado)
  })

  it('rechaza saltos y retrocesos', () => {
    expect(puedeTransicionar('REGISTRADO', 'ENTREGADO')).toBe(false)
    expect(puedeTransicionar('EN_REPARTO', 'EN_TRANSITO')).toBe(false)
    expect(puedeTransicionar('EN_TRANSITO', 'CANCELADO')).toBe(false)
    expect(puedeTransicionar('REGISTRADO', 'CANCELADO')).toBe(true)
  })

  it('identifica estados finales', () => {
    expect(esEstadoFinal('ENTREGADO')).toBe(true)
    expect(esEstadoFinal('CANCELADO')).toBe(true)
    expect(esEstadoFinal('EN_REPARTO')).toBe(false)
  })
})

describe('crearEnvioSchema', () => {
  const base = {
    remitenteNombre: 'Ana Ruiz',
    remitenteTelefono: '0991234567',
    destinatarioNombre: 'Luis Vega',
    destinatarioTelefono: '0987654321',
    destinatarioDireccion: 'Av. Atahualpa 12-34, Otavalo',
    rutaId: '3',
    tipoCarga: 'SOBRE' as const,
    pesoKg: 0.3,
  }
  const schema = crearEnvioSchema(TIPOS_CARGA_DEFAULT)

  it('acepta un envío válido', () => {
    expect(schema.safeParse(base).success).toBe(true)
  })

  it('rechaza peso mayor al máximo del tipo', () => {
    const r = schema.safeParse({ ...base, pesoKg: 1 })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.path).toEqual(['pesoKg'])
  })

  it('rechaza teléfono inválido', () => {
    expect(schema.safeParse({ ...base, remitenteTelefono: 'abc' }).success).toBe(false)
  })
})
