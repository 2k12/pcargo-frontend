import { describe, expect, it } from 'vitest'
import type { Estado } from '@/types/api'
import {
  accionLabel,
  esEstadoFinal,
  pesoTotal,
  puedeTransicionar,
  requiereNota,
  resumenItems,
  TIPOS_CARGA_DEFAULT,
  totalPiezas,
  transicionesPermitidas,
} from './domain'
import { crearEnvioSchema, itemsCotizables, toNuevoEnvio } from './schema'

describe('transicionesPermitidas', () => {
  it.each<[Estado, Estado[]]>([
    ['REGISTRADO', ['EN_TRANSITO', 'CANCELADO']],
    ['EN_TRANSITO', ['EN_REPARTO', 'NOVEDAD']],
    ['EN_REPARTO', ['ENTREGADO', 'NO_ENTREGADO', 'NOVEDAD']],
    ['NOVEDAD', ['EN_REPARTO', 'ENTREGADO', 'NO_ENTREGADO']],
    ['NO_ENTREGADO', ['EN_REPARTO']],
    ['ENTREGADO', []],
    ['CANCELADO', []],
  ])('%s → %j', (estado, esperado) => {
    expect(transicionesPermitidas(estado)).toEqual(esperado)
  })

  it('rechaza saltos y retrocesos', () => {
    expect(puedeTransicionar('REGISTRADO', 'ENTREGADO')).toBe(false)
    expect(puedeTransicionar('EN_REPARTO', 'EN_TRANSITO')).toBe(false)
    expect(puedeTransicionar('EN_TRANSITO', 'CANCELADO')).toBe(false)
    expect(puedeTransicionar('NO_ENTREGADO', 'ENTREGADO')).toBe(false)
    expect(puedeTransicionar('REGISTRADO', 'CANCELADO')).toBe(true)
  })

  it('identifica estados finales', () => {
    expect(esEstadoFinal('ENTREGADO')).toBe(true)
    expect(esEstadoFinal('CANCELADO')).toBe(true)
    expect(esEstadoFinal('NO_ENTREGADO')).toBe(false)
    expect(esEstadoFinal('NOVEDAD')).toBe(false)
  })

  it('NO_ENTREGADO y NOVEDAD exigen motivo', () => {
    expect(requiereNota('NO_ENTREGADO')).toBe(true)
    expect(requiereNota('NOVEDAD')).toBe(true)
    expect(requiereNota('ENTREGADO')).toBe(false)
    expect(requiereNota('CANCELADO')).toBe(false)
  })

  it('etiqueta el reintento de entrega', () => {
    expect(accionLabel('NO_ENTREGADO', 'EN_REPARTO')).toBe('Reintentar entrega')
    expect(accionLabel('EN_TRANSITO', 'EN_REPARTO')).toBe('Enviar a reparto')
    expect(accionLabel('EN_REPARTO', 'NOVEDAD')).toBe('Registrar novedad')
  })
})

describe('ítems', () => {
  it('resume con plurales en español y agrupa por tipo', () => {
    expect(
      resumenItems([
        { tipoCarga: 'PAQUETE', cantidad: 5 },
        { tipoCarga: 'CARTON', cantidad: 20 },
        { tipoCarga: 'PAQUETE', cantidad: 1 },
      ]),
    ).toBe('6 paquetes · 20 cartones')
    expect(resumenItems([{ tipoCarga: 'CARTON', cantidad: 1 }])).toBe('1 cartón')
    expect(resumenItems([{ tipoCarga: 'SOBRE', cantidad: 1 }, { tipoCarga: 'VALIJA', cantidad: 2 }])).toBe('1 sobre · 2 valijas')
  })

  it('calcula piezas y peso total (peso por unidad × cantidad)', () => {
    const items = [
      { cantidad: 5, pesoKg: 2 },
      { cantidad: 20, pesoKg: 8 },
    ]
    expect(totalPiezas(items)).toBe(25)
    expect(pesoTotal(items)).toBe(170)
    expect(pesoTotal([{ cantidad: 3, pesoKg: Number.NaN }])).toBe(0)
  })

  it('solo cotiza ítems completos y dentro de límites', () => {
    expect(itemsCotizables([{ tipoCarga: 'PAQUETE', cantidad: 5, pesoKg: 2 }], TIPOS_CARGA_DEFAULT)).toEqual([
      { tipoCarga: 'PAQUETE', cantidad: 5, pesoKg: 2 },
    ])
    expect(itemsCotizables([{ cantidad: 1 }], TIPOS_CARGA_DEFAULT)).toBeNull()
    expect(itemsCotizables([{ tipoCarga: 'SOBRE', cantidad: 1, pesoKg: 2 }], TIPOS_CARGA_DEFAULT)).toBeNull()
    expect(itemsCotizables([{ tipoCarga: 'PAQUETE', cantidad: 1.5, pesoKg: 2 }], TIPOS_CARGA_DEFAULT)).toBeNull()
    expect(itemsCotizables([], TIPOS_CARGA_DEFAULT)).toBeNull()
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
    items: [
      { tipoCarga: 'PAQUETE' as const, cantidad: 5, pesoKg: 2 },
      { tipoCarga: 'CARTON' as const, cantidad: 20, pesoKg: 8 },
    ],
    formaPago: 'AL_COBRO' as const,
  }
  const schema = crearEnvioSchema(TIPOS_CARGA_DEFAULT)

  it('acepta un envío con varios ítems y lo convierte al contrato', () => {
    const r = schema.safeParse(base)
    expect(r.success).toBe(true)
    expect(toNuevoEnvio(r.data!)).toMatchObject({ rutaId: 3, formaPago: 'AL_COBRO', items: base.items })
  })

  it('rechaza peso por unidad mayor al máximo del tipo, en la línea correcta', () => {
    const r = schema.safeParse({ ...base, items: [base.items[0], { tipoCarga: 'SOBRE', cantidad: 3, pesoKg: 1 }] })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.path).toEqual(['items', 1, 'pesoKg'])
  })

  it('exige forma de pago, al menos un ítem y cantidades enteras', () => {
    expect(schema.safeParse({ ...base, formaPago: undefined }).success).toBe(false)
    expect(schema.safeParse({ ...base, items: [] }).success).toBe(false)
    expect(schema.safeParse({ ...base, items: [{ tipoCarga: 'PAQUETE', cantidad: 0, pesoKg: 1 }] }).success).toBe(false)
    expect(schema.safeParse({ ...base, items: [{ tipoCarga: 'PAQUETE', cantidad: 2.5, pesoKg: 1 }] }).success).toBe(false)
  })

  it('rechaza teléfono inválido', () => {
    expect(schema.safeParse({ ...base, remitenteTelefono: 'abc' }).success).toBe(false)
  })
})
