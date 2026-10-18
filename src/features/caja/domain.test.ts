import { describe, expect, it } from 'vitest'
import { formatCurrency } from '@/lib/format'
import type { CierreCaja } from '@/types/api'
import { datosComprobante, numeroCierre } from './comprobantePdf'
import {
  crearCierreSchema,
  diferenciaCaja,
  MENSAJE_NOTA_DIFERENCIA,
  parseMonto,
  round2,
  sentidoDiferencia,
  textoDiferencia,
} from './domain'

describe('caja — diferencia', () => {
  it('diferencia = entregado − esperado, redondeada a centavos como el servidor', () => {
    expect(diferenciaCaja(10, 12.5)).toBe(-2.5)
    expect(diferenciaCaja(20.1, 20)).toBe(0.1)
    expect(diferenciaCaja(0.3, 0.1 + 0.2)).toBe(0)
    expect(Object.is(diferenciaCaja(5, 5), -0)).toBe(false)
    expect(round2(1.005)).toBe(1.01)
  })

  it('clasifica faltante, sobrante o cuadra y lo dice en palabras', () => {
    expect(sentidoDiferencia(-2)).toBe('faltante')
    expect(sentidoDiferencia(0.5)).toBe('sobrante')
    expect(sentidoDiferencia(0)).toBe('cuadra')
    expect(textoDiferencia(-2)).toBe(`Faltan ${formatCurrency(2)}`)
    expect(textoDiferencia(0.5)).toMatch(/^Sobran .*0,50$/)
    expect(textoDiferencia(0)).toBe('Cuadra')
  })
})

describe('caja — monto escrito a mano', () => {
  it('acepta coma o punto decimal y hasta 2 decimales', () => {
    expect(parseMonto('12,50')).toBe(12.5)
    expect(parseMonto('12.5')).toBe(12.5)
    expect(parseMonto('$ 7')).toBe(7)
    expect(parseMonto('0')).toBe(0)
  })

  it('rechaza negativos, texto y más de 2 decimales', () => {
    expect(parseMonto('-1')).toBeNull()
    expect(parseMonto('abc')).toBeNull()
    expect(parseMonto('1,234')).toBeNull()
    expect(parseMonto('')).toBeNull()
  })
})

describe('caja — formulario de cierre', () => {
  const schema = crearCierreSchema(25)

  it('sin diferencia la nota es opcional', () => {
    expect(schema.safeParse({ monto: '25', nota: '' }).success).toBe(true)
  })

  it('con diferencia la nota es obligatoria', () => {
    const r = schema.safeParse({ monto: '20', nota: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues.map((i) => i.message)).toContain(MENSAJE_NOTA_DIFERENCIA)
    expect(schema.safeParse({ monto: '20', nota: 'Faltó el vuelto' }).success).toBe(true)
  })

  it('el monto es obligatorio y válido', () => {
    expect(schema.safeParse({ monto: '', nota: '' }).success).toBe(false)
    expect(schema.safeParse({ monto: '1,999', nota: 'x' }).success).toBe(false)
  })
})

describe('caja — comprobante', () => {
  const cierre: CierreCaja = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef0123456789',
    usuario: { id: 'u3', nombre: 'Rider Uno', rol: 'REPARTIDOR' },
    recibidoPor: { id: 'u2', nombre: 'Operador Ibarra' },
    fecha: '2026-10-18T22:00:00.000Z',
    esperado: 25,
    entregado: 23,
    diferencia: -2,
    cantidad: 2,
    nota: 'Faltó el vuelto',
    porTipo: [{ tipo: 'CONTRA_ENTREGA', cantidad: 2, monto: 25 }],
    cobros: [
      {
        id: 'k1',
        tipo: 'CONTRA_ENTREGA',
        monto: 10,
        envioId: 'e1',
        numeroGuia: 40461,
        formaPago: 'AL_COBRO',
        usuario: { id: 'u3', nombre: 'Rider Uno' },
        fecha: '2026-10-18T15:00:00.000Z',
        cierreId: 'a1b2',
      },
    ],
  }

  it('arma los textos con número corto, personas, montos y cobros', () => {
    const d = datosComprobante(cierre)
    expect(numeroCierre(cierre.id)).toBe('A1B2C3D4')
    expect(d.numero).toBe('A1B2C3D4')
    expect(d.nombreArchivo).toBe('cierre-caja-A1B2C3D4.pdf')
    expect(d.entrega).toBe('Rider Uno (Repartidor)')
    expect(d.recibe).toBe('Operador Ibarra')
    expect(d.diferencia).toMatch(/^Faltan/)
    expect(d.cantidad).toBe('2 cobros')
    expect(d.porTipo).toEqual([{ tipo: 'Contra entrega', detalle: expect.stringContaining('2 ·') }])
    expect(d.cobros[0]).toMatchObject({ guia: '0040461', tipo: 'Contra entrega' })
    expect(d.nota).toBe('Faltó el vuelto')
  })
})
