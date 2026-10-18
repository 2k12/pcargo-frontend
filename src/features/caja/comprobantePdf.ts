// Comprobante del cierre de caja en PDF (A5 vertical), con firmas de quien entrega y quien recibe.
// jsPDF se carga con import() dinámico: solo se descarga al imprimir un comprobante.
import type { jsPDF as JsPdf } from 'jspdf'
import { ROL_LABEL } from '@/features/auth/roles'
import { numeroGuiaImpreso } from '@/features/envios/guiaImprimible'
import { descargarPdf, imprimirPdf, type AccionGuia } from '@/features/envios/guiaPdf'
import { formatCurrency, formatDateTime } from '@/lib/format'
import type { CierreCaja } from '@/types/api'
import { textoDiferencia, TIPO_COBRO_LABEL } from './domain'

export interface DatosComprobante {
  numero: string
  fecha: string
  entrega: string
  recibe: string
  esperado: string
  entregado: string
  diferencia: string
  cantidad: string
  nota: string
  porTipo: { tipo: string; detalle: string }[]
  cobros: { guia: string; tipo: string; fecha: string; monto: string }[]
  nombreArchivo: string
}

/** Número corto y legible del cierre (los 8 primeros caracteres del id, en mayúsculas). */
export const numeroCierre = (id: string): string => id.replace(/-/g, '').slice(0, 8).toUpperCase()

/** Textos del comprobante, ya formateados (lógica pura y testeable). */
export function datosComprobante(c: CierreCaja): DatosComprobante {
  const numero = numeroCierre(c.id)
  return {
    numero,
    fecha: formatDateTime(c.fecha),
    entrega: `${c.usuario.nombre} (${ROL_LABEL[c.usuario.rol]})`,
    recibe: c.recibidoPor.nombre,
    esperado: formatCurrency(c.esperado),
    entregado: formatCurrency(c.entregado),
    diferencia: textoDiferencia(c.diferencia),
    cantidad: `${c.cantidad} ${c.cantidad === 1 ? 'cobro' : 'cobros'}`,
    nota: c.nota?.trim() ?? '',
    porTipo: c.porTipo.map((t) => ({
      tipo: TIPO_COBRO_LABEL[t.tipo],
      detalle: `${t.cantidad} · ${formatCurrency(t.monto)}`,
    })),
    cobros: (c.cobros ?? []).map((b) => ({
      guia: numeroGuiaImpreso(b.numeroGuia),
      tipo: TIPO_COBRO_LABEL[b.tipo],
      fecha: formatDateTime(b.fecha),
      monto: formatCurrency(b.monto),
    })),
    nombreArchivo: `cierre-caja-${numero}.pdf`,
  }
}

const ANCHO = 148
const ALTO = 210
const M = 12

function fila(doc: JsPdf, rotulo: string, valor: string, y: number, negrita = false) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(110, 110, 110)
  doc.text(rotulo, M, y)
  doc.setFont('helvetica', negrita ? 'bold' : 'normal')
  doc.setTextColor(25, 25, 25)
  doc.text(valor, ANCHO - M, y, { align: 'right' })
}

function linea(doc: JsPdf, y: number) {
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.2)
  doc.line(M, y, ANCHO - M, y)
}

/** Dibuja el comprobante; agrega páginas si la lista de cobros no cabe. */
export function componerComprobante(doc: JsPdf, d: DatosComprobante): void {
  doc.setProperties({ title: `Cierre de caja ${d.numero} - PCargo`, creator: 'PCargo' })
  let y = M + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(0, 126, 193)
  doc.text('PCargo', M, y)
  doc.setFontSize(9)
  doc.setTextColor(25, 25, 25)
  doc.text(`N.º ${d.numero}`, ANCHO - M, y, { align: 'right' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Comprobante de cierre de caja', M, y)
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text(d.fecha, ANCHO - M, y, { align: 'right' })
  y += 5
  linea(doc, y)

  y += 7
  fila(doc, 'Entrega', d.entrega, y)
  y += 5.5
  fila(doc, 'Recibe', d.recibe, y)
  y += 5.5
  fila(doc, 'Cobros incluidos', d.cantidad, y)
  y += 4
  linea(doc, y)
  y += 7
  fila(doc, 'Esperado', d.esperado, y)
  y += 5.5
  fila(doc, 'Entregado', d.entregado, y, true)
  y += 5.5
  fila(doc, 'Diferencia', d.diferencia, y, true)
  for (const t of d.porTipo) {
    y += 5.5
    fila(doc, `  ${t.tipo}`, t.detalle, y)
  }
  if (d.nota) {
    y += 8
    doc.setFontSize(8)
    doc.setTextColor(110, 110, 110)
    doc.text('Nota', M, y)
    y += 4
    doc.setTextColor(25, 25, 25)
    const lineas = doc.splitTextToSize(d.nota, ANCHO - 2 * M) as string[]
    doc.text(lineas, M, y)
    y += lineas.length * 3.6
  }

  if (d.cobros.length) {
    y += 6
    linea(doc, y)
    y += 5
    const encabezado = () => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(110, 110, 110)
      doc.text('GUÍA', M, y)
      doc.text('TIPO', M + 24, y)
      doc.text('FECHA', M + 56, y)
      doc.text('MONTO', ANCHO - M, y, { align: 'right' })
      y += 4.5
    }
    encabezado()
    doc.setFont('helvetica', 'normal')
    for (const c of d.cobros) {
      if (y > ALTO - 40) {
        doc.addPage('a5', 'portrait')
        y = M + 4
        encabezado()
        doc.setFont('helvetica', 'normal')
      }
      doc.setFontSize(8)
      doc.setTextColor(25, 25, 25)
      doc.text(c.guia, M, y)
      doc.text(c.tipo, M + 24, y)
      doc.text(c.fecha, M + 56, y)
      doc.text(c.monto, ANCHO - M, y, { align: 'right' })
      y += 4.5
    }
  }

  // Firmas al pie de la última página.
  const yf = ALTO - 18
  doc.setDrawColor(25, 25, 25)
  doc.setLineWidth(0.25)
  const mitad = ANCHO / 2
  doc.line(M, yf, mitad - 6, yf)
  doc.line(mitad + 6, yf, ANCHO - M, yf)
  doc.setFontSize(7.5)
  doc.setTextColor(110, 110, 110)
  doc.text('Firma de quien entrega', (M + mitad - 6) / 2, yf + 4, { align: 'center' })
  doc.text('Firma de quien recibe', (mitad + 6 + ANCHO - M) / 2, yf + 4, { align: 'center' })
}

export async function crearComprobantePdf(cierre: CierreCaja): Promise<{ blob: Blob; nombreArchivo: string }> {
  const d = datosComprobante(cierre)
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
  componerComprobante(doc, d)
  return { blob: doc.output('blob'), nombreArchivo: d.nombreArchivo }
}

export const MENSAJE_ERROR_COMPROBANTE = 'No se pudo generar el comprobante en PDF. Intenta de nuevo.'

/** Imprime o descarga el comprobante del cierre. */
export async function generarComprobante(cierre: CierreCaja, accion: AccionGuia): Promise<void> {
  const pdf = await crearComprobantePdf(cierre)
  if (accion === 'imprimir') imprimirPdf(pdf)
  else descargarPdf(pdf)
}
