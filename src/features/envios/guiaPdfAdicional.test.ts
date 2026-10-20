import { jsPDF, type TextOptionsLight } from 'jspdf'
import { describe, expect, it, vi } from 'vitest'
import type { Envio } from '@/types/api'
import { ALTO_COPIA, componerGuia, posicionCopias } from './guiaPdf'
import { datosGuia } from './guiaImprimible'

// PNG 1×1 para el QR (el dibujo no necesita uno real).
const QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const envio = {
  numeroGuia: 40461,
  remitente: { nombre: 'Ana', telefono: '0991112233', direccion: null },
  destinatario: { nombre: 'Luis', telefono: '0994445566', direccion: 'Quito centro' },
  ruta: { id: 7, origen: 'Ibarra', destino: 'Quito' },
  items: [{ tipoCarga: 'PAQUETE', cantidad: 1, pesoKg: 2, costoUnitario: 6, subtotal: 6 }],
  totalPiezas: 1,
  pesoTotalKg: 2,
  zona: 'URBANA',
  descripcion: null,
  costo: 6,
  costoAdicional: 0,
  formaPago: 'PAGADO',
  estado: 'REGISTRADO',
  registro: { fecha: '2026-10-19T15:00:00.000Z', operador: 'Operador' },
  entrega: null,
  evidencia: null,
  referenciaExterna: null,
} as unknown as Envio

/** Dibuja la guía y devuelve los textos con su posición y ancho (mm). */
function textosDibujados(e: Envio) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const textos: { texto: string; x: number; y: number; ancho: number }[] = []
  const original = doc.text.bind(doc)
  vi.spyOn(doc, 'text').mockImplementation(((t: string | string[], x: number, y: number, opts?: TextOptionsLight) => {
    const texto = Array.isArray(t) ? t.join(' ') : t
    textos.push({ texto, x, y, ancho: doc.getTextWidth(texto) })
    return original(t, x, y, opts)
  }) as typeof doc.text)
  componerGuia(doc, datosGuia(e, 'https://pcargo.ec'), null, QR, 'superior')
  return textos
}

describe('guía en PDF — costo adicional', () => {
  it('sin adicional no dibuja la línea extra', () => {
    expect(textosDibujados(envio).some((t) => t.texto === 'COSTO ADICIONAL')).toBe(false)
  })

  it('con adicional dibuja «COSTO ADICIONAL» antes del total, dentro de la casilla del valor y sin desbordar', () => {
    const textos = textosDibujados({ ...envio, costo: 9999.99 + 6, costoAdicional: 9999.99 })
    const [y0] = posicionCopias('superior')
    const rotulos = textos.filter((t) => t.texto === 'COSTO ADICIONAL' && t.y < y0 + ALTO_COPIA)
    expect(rotulos).toHaveLength(1)
    const rotulo = rotulos[0]!
    const valor = textos.find((t) => /9\.999,99/.test(t.texto) && t.y === rotulo.y)!
    const total = textos.find((t) => /10\.005,99/.test(t.texto) && t.y < y0 + ALTO_COPIA)!
    expect(valor).toBeDefined()
    expect(total.y).toBeGreaterThan(rotulo.y)
    // Casilla VALOR USD: de x = 172 a 204 mm; el rótulo no pisa el monto (alineado a la derecha).
    expect(rotulo.x).toBeGreaterThanOrEqual(172)
    expect(rotulo.x + rotulo.ancho).toBeLessThan(valor.x - valor.ancho)
    expect(valor.x).toBeLessThanOrEqual(204)
    expect(total.x - total.ancho).toBeGreaterThanOrEqual(172)
  })
})
