import { describe, expect, it } from 'vitest'
import type { Estado } from '@/types/api'
import {
  accionLabel,
  dependeDeZona,
  esEstadoFinal,
  mayoreoTexto,
  notasMayoreo,
  precioDesde,
  precioTipoTexto,
  precioUnitario,
  pesoTotal,
  puedeTransicionar,
  requiereNota,
  resumenItems,
  TIPOS_CARGA_DEFAULT,
  totalPiezas,
  transicionesPermitidas,
  zonaInfluye,
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
    zona: 'URBANA' as const,
  }
  const schema = crearEnvioSchema(TIPOS_CARGA_DEFAULT)

  it('acepta un envío con varios ítems y lo convierte al contrato', () => {
    const r = schema.safeParse(base)
    expect(r.success).toBe(true)
    expect(toNuevoEnvio(r.data!)).toMatchObject({ rutaId: 3, formaPago: 'AL_COBRO', zona: 'URBANA', items: base.items })
  })

  it('envía la zona elegida y exige que sea URBANA o RURAL (contrato v8)', () => {
    const rural = schema.safeParse({ ...base, zona: 'RURAL' })
    expect(toNuevoEnvio(rural.data!).zona).toBe('RURAL')
    expect(schema.safeParse({ ...base, zona: 'CENTRO' }).success).toBe(false)
  })

  it('acepta los tipos nuevos con sus pesos máximos (tela y plumón 50 kg, cartón 35 kg)', () => {
    const items = [
      { tipoCarga: 'TELA' as const, cantidad: 60, pesoKg: 50 },
      { tipoCarga: 'PLUMON_PEQUENO' as const, cantidad: 1, pesoKg: 50 },
      { tipoCarga: 'PLUMON_GRANDE' as const, cantidad: 1, pesoKg: 50 },
    ]
    expect(schema.safeParse({ ...base, items }).success).toBe(true)
    expect(schema.safeParse({ ...base, items: [{ tipoCarga: 'TELA', cantidad: 1, pesoKg: 51 }] }).success).toBe(false)
    expect(schema.safeParse({ ...base, items: [{ tipoCarga: 'CARTON', cantidad: 1, pesoKg: 36 }] }).success).toBe(false)
    expect(schema.safeParse({ ...base, items: [{ tipoCarga: 'PAQUETE', cantidad: 1, pesoKg: 50 }] }).success).toBe(true)
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

describe('precio por unidad (contrato v8)', () => {
  const tipo = (codigo: string) => TIPOS_CARGA_DEFAULT.find((t) => t.codigo === codigo)!
  const tela = tipo('TELA')

  it('el catálogo por defecto publica el precio de cada tipo, sin factor ni recargo por peso', () => {
    expect(TIPOS_CARGA_DEFAULT.map((t) => [t.codigo, t.precio, t.precioRural, t.pesoMaxKg])).toEqual([
      ['SOBRE', 3, null, 0.5],
      ['PAQUETE', 3, null, 50],
      ['CARTON', 3, null, 35],
      ['VALIJA', 3, null, 25],
      ['TELA', 1.25, 1.5, 50],
      ['PLUMON_PEQUENO', 3, null, 50],
      ['PLUMON_GRANDE', 4, null, 50],
    ])
    for (const t of TIPOS_CARGA_DEFAULT) expect(t).not.toHaveProperty('factor')
  })

  it('la zona rural cambia solo el precio de la tela', () => {
    expect(precioUnitario(tela, 'URBANA', 10)).toEqual({ precio: 1.25, mayoreo: false })
    expect(precioUnitario(tela, 'RURAL', 10)).toEqual({ precio: 1.5, mayoreo: false })
    expect(precioUnitario(tipo('PAQUETE'), 'RURAL', 1)).toEqual({ precio: 3, mayoreo: false })
    expect(precioUnitario(tipo('PLUMON_GRANDE'), 'RURAL', 1).precio).toBe(4)
    expect(dependeDeZona(tela)).toBe(true)
    expect(dependeDeZona(tipo('SOBRE'))).toBe(false)
    expect(zonaInfluye([{ tipoCarga: 'PAQUETE' }, { tipoCarga: 'TELA' }], TIPOS_CARGA_DEFAULT)).toBe(true)
    expect(zonaInfluye([{ tipoCarga: 'PAQUETE' }], TIPOS_CARGA_DEFAULT)).toBe(false)
  })

  it('más de 50 rollos en el envío: todos a $1,00 en cualquier zona; con 50 exactos no aplica', () => {
    expect(precioUnitario(tela, 'URBANA', 51)).toEqual({ precio: 1, mayoreo: true })
    expect(precioUnitario(tela, 'RURAL', 60)).toEqual({ precio: 1, mayoreo: true })
    expect(precioUnitario(tela, 'URBANA', 50)).toEqual({ precio: 1.25, mayoreo: false })
    expect(precioUnitario(tela, 'RURAL', 50)).toEqual({ precio: 1.5, mayoreo: false })
  })

  it('textos publicados: precio por zona, regla de volumen y «desde» con el menor precio base', () => {
    expect(precioTipoTexto(tela)).toBe('$1,25 urbana · $1,50 rural')
    expect(precioTipoTexto(tipo('PLUMON_GRANDE'))).toBe('$4,00')
    expect(mayoreoTexto(tela)).toBe('más de 50 rollos de tela: $1,00 c/u')
    expect(mayoreoTexto(tipo('SOBRE'))).toBeNull()
    // $1,25 (precio base de la tela), no el $1,00 de mayoreo.
    expect(precioDesde(TIPOS_CARGA_DEFAULT)).toBe(1.25)
    expect(precioDesde([])).toBeNull()
  })

  it('notas de mayoreo solo para los tipos a los que la cotización aplicó el precio por volumen', () => {
    const item = { cantidad: 60, pesoKg: 2, costoUnitario: 1, subtotal: 60 }
    expect(notasMayoreo({ items: [{ ...item, tipoCarga: 'TELA', mayoreo: true }] }, TIPOS_CARGA_DEFAULT)).toEqual([
      'Más de 50 rollos de tela: $1,00 c/u',
    ])
    expect(notasMayoreo({ items: [{ ...item, tipoCarga: 'TELA', mayoreo: false }] }, TIPOS_CARGA_DEFAULT)).toEqual([])
  })

  it('nombra los tipos nuevos en singular y plural', () => {
    expect(resumenItems([
      { tipoCarga: 'TELA', cantidad: 60 },
      { tipoCarga: 'PLUMON_PEQUENO', cantidad: 1 },
      { tipoCarga: 'PLUMON_GRANDE', cantidad: 2 },
    ])).toBe('60 rollos de tela · 1 plumón pequeño · 2 plumones grandes')
  })
})
