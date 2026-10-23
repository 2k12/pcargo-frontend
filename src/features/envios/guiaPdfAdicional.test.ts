import { jsPDF, type TextOptionsLight } from 'jspdf'
import { describe, expect, it, vi } from 'vitest'
import type { Envio } from '@/types/api'
import { ALTO_GUIA, ANCHO_TALON, componerGuia, POSICIONES_HOJA, posicionGuia, X_TALON, type PosicionHoja } from './guiaPdf'
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
  fechaGuia: '2026-10-19',
  registro: { fecha: '2026-10-19T15:00:00.000Z', operador: 'Operador' },
  entrega: null,
  evidencia: null,
  referenciaExterna: null,
} as unknown as Envio

/** Envío con todos los textos al límite: nada debe salirse de su parte. */
const envioLargo = {
  ...envio,
  numeroGuia: 9999999,
  remitente: { nombre: 'Importadora y Comercializadora Textiles del Norte Atuntaqui Cía. Ltda.', telefono: '0991112233', direccion: 'Av. Julio Andrade y Calle Bolívar, junto al parque central, local 12' },
  destinatario: {
    nombre: 'María Fernanda de los Ángeles Villavicencio Benalcázar',
    telefono: '0994445566',
    direccion: 'Urbanización Los Arrayanes, calle Las Orquídeas N45-120 y Av. Eloy Alfaro, edificio Torre Azul, departamento 8B',
  },
  ruta: { id: 7, origen: 'Atuntaqui', destino: 'Quito' },
  items: [
    { tipoCarga: 'SOBRE', cantidad: 12, pesoKg: 1, costoUnitario: 1, subtotal: 12 },
    { tipoCarga: 'CARTON', cantidad: 25, pesoKg: 80, costoUnitario: 4, subtotal: 100 },
    { tipoCarga: 'ROLLO_TELA', cantidad: 3, pesoKg: 30, costoUnitario: 5, subtotal: 15 },
    { tipoCarga: 'CAJA_GRANDE', cantidad: 2, pesoKg: 20, costoUnitario: 8, subtotal: 16 },
  ],
  pesoTotalKg: 131.25,
  zona: 'RURAL',
  descripcion: 'Prendas de vestir, telas e insumos de confección para la temporada escolar de la Sierra',
  costo: 9999.99 + 143,
  costoAdicional: 9999.99,
  formaPago: 'AL_COBRO',
  estado: 'ENTREGADO',
  entrega: { fecha: '2026-10-20T15:00:00.000Z', resultado: 'ENTREGADO', operador: 'Repartidor de la Ruta Norte' },
  evidencia: { recibidoPor: 'Guardia del edificio Torre Azul, Sr. Bolívar Chiriboga' },
  referenciaExterna: 'PED-2026-000123456789',
} as unknown as Envio

interface TextoDibujado {
  texto: string
  x: number
  y: number
  izquierda: number
  derecha: number
}

/** Dibuja la guía y devuelve los textos con su posición y sus bordes izquierdo y derecho (mm). */
function textosDibujados(e: Envio, posicion: PosicionHoja = 0) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const textos: TextoDibujado[] = []
  const original = doc.text.bind(doc)
  vi.spyOn(doc, 'text').mockImplementation(((t: string | string[], x: number, y: number, opts?: TextOptionsLight) => {
    const lineas = Array.isArray(t) ? t : [t]
    const ancho = Math.max(...lineas.map((l) => doc.getTextWidth(l))) + (opts?.charSpace ?? 0) * Math.max(...lineas.map((l) => l.length - 1))
    const izquierda = opts?.align === 'right' ? x - ancho : opts?.align === 'center' ? x - ancho / 2 : x
    textos.push({ texto: lineas.join(' '), x, y, izquierda, derecha: izquierda + ancho })
    return original(t, x, y, opts)
  }) as typeof doc.text)
  componerGuia(doc, datosGuia(e, 'https://pcargo.ec'), null, QR, posicion)
  return textos
}

describe('guía en PDF — talón', () => {
  it.each(POSICIONES_HOJA)('en la posición %s ningún texto se sale del talón, aun con datos largos', (posicion) => {
    const T = posicionGuia(posicion)
    for (const t of textosDibujados(envioLargo, posicion)) {
      expect(t.izquierda, t.texto).toBeGreaterThanOrEqual(X_TALON - 0.01)
      expect(t.derecha, t.texto).toBeLessThanOrEqual(X_TALON + ANCHO_TALON + 0.01)
      expect(t.y, t.texto).toBeGreaterThan(T)
      expect(t.y, t.texto).toBeLessThanOrEqual(T + ALTO_GUIA)
    }
  })

  it('solo imprime el talón: datos del envío y las firmas del remitente y de quien recibe', () => {
    const textos = textosDibujados(envio).map((t) => t.texto)
    expect(textos).toEqual(
      expect.arrayContaining(['TALÓN DE ENTREGA', '0040461', 'Luis', 'Quito centro', 'Ana', 'ACEPTO CONDICIONES (REMITENTE)', 'RECIBÍ CONFORME', 'FIRMA DE QUIEN RECIBE']),
    )
    expect(textos).not.toContain('COPIA PAQUETE')
  })

  it('AL COBRO se resalta en la casilla del valor; pagado, no', () => {
    expect(textosDibujados(envio).some((t) => t.texto === 'COBRAR AL ENTREGAR (USD)')).toBe(false)
    expect(textosDibujados({ ...envio, formaPago: 'AL_COBRO' } as Envio).some((t) => t.texto === 'COBRAR AL ENTREGAR (USD)')).toBe(true)
  })
})

describe('guía en PDF — costo adicional', () => {
  it('sin adicional no dibuja la línea extra', () => {
    expect(textosDibujados(envio).some((t) => t.texto === 'ADICIONAL')).toBe(false)
  })

  it('con adicional dibuja «ADICIONAL» antes del total, dentro de la casilla del valor del talón', () => {
    const textos = textosDibujados({ ...envio, costo: 9999.99 + 6, costoAdicional: 9999.99 })
    const rotulo = textos.find((t) => t.texto === 'ADICIONAL')!
    expect(rotulo).toBeDefined()
    const valor = textos.find((t) => /9\.999,99/.test(t.texto) && t.y === rotulo.y)!
    const total = textos.find((t) => /10\.005,99/.test(t.texto))!
    expect(valor).toBeDefined()
    expect(total.y).toBeGreaterThan(rotulo.y)
    // El rótulo no pisa el monto (alineado a la derecha).
    expect(rotulo.derecha).toBeLessThan(valor.izquierda)
  })
})
