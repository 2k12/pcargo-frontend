import { jsPDF, type TextOptionsLight } from 'jspdf'
import { describe, expect, it, vi } from 'vitest'
import type { Envio } from '@/types/api'
import { datosReporte, hoyEC, mover, nombreArchivoReporte, valorTotal } from './domain'
import { COLUMNAS_REPORTE, componerReporte, MARGEN_REPORTE } from './reportePdf'

const envio = (numeroGuia: number, costo: number, extra: Partial<Envio> = {}) =>
  ({
    id: `e${numeroGuia}`,
    numeroGuia,
    costo,
    formaPago: 'PAGADO',
    estado: 'REGISTRADO',
    remitente: { nombre: 'Ana', telefono: '0991112233', direccion: null },
    destinatario: { nombre: 'Luis', telefono: '0994445566', direccion: 'Quito centro' },
    ruta: { id: 7, origen: 'Ibarra', destino: 'Quito' },
    ...extra,
  }) as unknown as Envio

describe('orden de las guías', () => {
  it('mueve una guía a otra posición sin perder ninguna', () => {
    expect(mover(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(mover(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('posiciones fuera de la lista no cambian nada', () => {
    const lista = ['a', 'b']
    expect(mover(lista, 0, 5)).toBe(lista)
    expect(mover(lista, -1, 0)).toBe(lista)
  })
})

describe('datos del reporte', () => {
  it('suma los valores sin errores de redondeo', () => {
    expect(valorTotal([{ costo: 0.1 }, { costo: 0.2 }, { costo: 9999.99 }])).toBe(10000.29)
    expect(valorTotal([])).toBe(0)
  })

  it('numera las guías en el orden recibido y calcula los totales', () => {
    const d = datosReporte('Entregas del martes', '2026-10-20', [envio(40462, 3.5), envio(40460, 12, { formaPago: 'AL_COBRO' })])
    expect(d.titulo).toBe('Entregas del martes')
    expect(d.fecha).toBe('martes, 20 de octubre de 2026')
    expect(d.filas.map((f) => [f.n, f.guia, f.pago])).toEqual([
      ['1', '0040462', 'Pagado'],
      ['2', '0040460', 'Al cobro'],
    ])
    expect(d.filas[0]!.ruta).toBe('IBARRA - QUITO')
    expect(d.totalGuias).toBe('2')
    expect(d.totalValor).toMatch(/15,50/)
    expect(d.nombreArchivo).toBe('entregas-del-martes-2026-10-20.pdf')
  })

  it('sin nombre usa «Reporte diario»', () => {
    expect(datosReporte('   ', '2026-10-20', []).titulo).toBe('Reporte diario')
    expect(nombreArchivoReporte('¡Ñandú & Cía!', '2026-10-20')).toBe('nandu-cia-2026-10-20.pdf')
  })

  it('hoy es la fecha de Ecuador (UTC−5)', () => {
    expect(hoyEC(Date.parse('2026-10-21T03:00:00Z'))).toBe('2026-10-20')
  })
})

/** Dibuja el reporte y devuelve los textos con su hoja y su posición. */
function textosDelReporte(envios: Envio[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const textos: { texto: string; hoja: number; x: number; y: number; derecha: number }[] = []
  const original = doc.text.bind(doc)
  vi.spyOn(doc, 'text').mockImplementation(((t: string | string[], x: number, y: number, opts?: TextOptionsLight) => {
    const lineas = Array.isArray(t) ? t : [t]
    const ancho = Math.max(...lineas.map((l) => doc.getTextWidth(l)))
    const izquierda = opts?.align === 'right' ? x - ancho : x
    textos.push({ texto: lineas.join(' '), hoja: doc.getCurrentPageInfo().pageNumber, x: izquierda, y, derecha: izquierda + ancho })
    return original(t, x, y, opts)
  }) as typeof doc.text)
  componerReporte(doc, datosReporte('Reporte diario', '2026-10-20', envios), null)
  return { textos, hojas: doc.getNumberOfPages() }
}

describe('reporte en PDF', () => {
  it('las columnas ocupan justo el ancho útil de la hoja', () => {
    expect(COLUMNAS_REPORTE.reduce((s, c) => s + c.ancho, 0)).toBe(210 - 2 * MARGEN_REPORTE)
  })

  it('arriba el nombre y los datos de PCargo; luego las guías en orden; al final los totales', () => {
    const { textos } = textosDelReporte([envio(40462, 3.5), envio(40460, 12)])
    const y = (t: string) => textos.find((x) => x.texto === t)!.y
    expect(textos.map((t) => t.texto)).toEqual(expect.arrayContaining(['PCargo', 'SERVICIO A DOMICILIO DE ENCOMIENDAS', 'Reporte diario']))
    expect(y('Reporte diario')).toBeLessThan(y('0040462'))
    expect(y('0040462')).toBeLessThan(y('0040460'))
    expect(y('0040460')).toBeLessThan(y('Total de guías'))
    expect(textos.find((t) => t.y === y('Total de guías') && t.texto === '2')).toBeDefined()
    expect(textos.some((t) => /15,50/.test(t.texto) && t.y > y('Total de guías'))).toBe(true)
  })

  it('con muchas guías sigue en otra hoja y ningún texto se sale de los márgenes', () => {
    const largo = 'Importadora y Comercializadora Textiles del Norte Atuntaqui Cía. Ltda.'
    const envios = Array.from({ length: 60 }, (_, i) =>
      envio(40000 + i, 9999.99, { remitente: { nombre: largo, telefono: '1', direccion: null }, destinatario: { nombre: largo, telefono: '1', direccion: 'x' } } as Partial<Envio>),
    )
    const { textos, hojas } = textosDelReporte(envios)
    expect(hojas).toBeGreaterThan(1)
    expect(textos.filter((t) => t.texto === 'GUÍA').length).toBe(hojas)
    expect(textos.filter((t) => /^Página \d+ de \d+$/.test(t.texto)).length).toBe(hojas)
    for (const t of textos) {
      expect(t.x, t.texto).toBeGreaterThanOrEqual(MARGEN_REPORTE - 0.01)
      expect(t.derecha, t.texto).toBeLessThanOrEqual(210 - MARGEN_REPORTE + 0.01)
      expect(t.y, t.texto).toBeLessThan(297 - 5)
    }
  })
})
