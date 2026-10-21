// Reporte diario en PDF (A4 vertical): arriba el nombre del reporte y los datos de PCargo, luego las
// guías en el orden elegido y al final el total de guías y la suma de sus valores.
// jsPDF se carga con import() dinámico: solo se descarga al generar un reporte.
import type { jsPDF as JsPdf } from 'jspdf'
import { cargarLogo, descargarPdf, type Logo } from '@/features/envios/guiaPdf'
import type { Envio } from '@/types/api'
import { datosReporte, type DatosReporte, type FilaReporte } from './domain'

type Rgb = [number, number, number]
const AZUL: Rgb = [27, 42, 89]
const AZUL_MARCA: Rgb = [0, 126, 193]
const TINTA: Rgb = [25, 25, 25]
const GRIS: Rgb = [110, 110, 110]
const FONDO: Rgb = [243, 245, 249]
const BLANCO: Rgb = [255, 255, 255]

const ANCHO = 210
const ALTO = 297
export const MARGEN_REPORTE = 12
const M = MARGEN_REPORTE
const FIN = ANCHO - M
const ALTO_FILA = 6.5
/** Debajo de esta altura no entra otra fila: se pasa a la hoja siguiente. */
const LIMITE_FILAS = ALTO - 18

/** Columnas de la tabla: rótulo, ancho (mm) y alineación. Suman el ancho útil de la hoja. */
export const COLUMNAS_REPORTE: { clave: keyof FilaReporte; rotulo: string; ancho: number; derecha?: boolean }[] = [
  { clave: 'n', rotulo: 'N.º', ancho: 9 },
  { clave: 'guia', rotulo: 'GUÍA', ancho: 18 },
  { clave: 'ruta', rotulo: 'RUTA', ancho: 33 },
  { clave: 'remitente', rotulo: 'REMITENTE', ancho: 40 },
  { clave: 'destinatario', rotulo: 'DESTINATARIO', ancho: 42 },
  { clave: 'pago', rotulo: 'PAGO', ancho: 20 },
  { clave: 'valor', rotulo: 'VALOR', ancho: 24, derecha: true },
]

function fuente(doc: JsPdf, tamano: number, estilo: 'normal' | 'bold' = 'normal', color: Rgb = TINTA) {
  doc.setFont('helvetica', estilo)
  doc.setFontSize(tamano)
  doc.setTextColor(...color)
}

function ajustar(doc: JsPdf, texto: string, max: number): string {
  if (doc.getTextWidth(texto) <= max) return texto
  let t = texto
  while (t.length > 1 && doc.getTextWidth(`${t}...`) > max) t = t.slice(0, -1)
  return `${t.trimEnd()}...`
}

/** Cabecera de la primera hoja: logo y datos de PCargo, nombre del reporte y fecha. Devuelve la Y siguiente. */
function cabecera(doc: JsPdf, d: DatosReporte, logo: Logo | null): number {
  let x = M
  if (logo) {
    doc.addImage(logo.data, 'PNG', M, M, 14, 14)
    x = M + 17
  }
  fuente(doc, 18, 'bold', AZUL_MARCA)
  doc.text('PCargo', x, M + 6.5)
  fuente(doc, 7.5, 'bold', AZUL)
  doc.text(d.empresa.servicio, x, M + 10.5)
  fuente(doc, 7, 'normal', GRIS)
  doc.text(`${d.empresa.direccion} · ${d.empresa.ciudad}`, x, M + 14)
  doc.text(d.empresa.telefonos, x, M + 17.3)

  fuente(doc, 7, 'normal', GRIS)
  doc.text(`Generado: ${d.generado}`, FIN, M + 4, { align: 'right' })

  let y = M + 22
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.4)
  doc.line(M, y, FIN, y)

  y += 8
  fuente(doc, 15, 'bold', AZUL)
  const titulo = doc.splitTextToSize(d.titulo, FIN - M) as string[]
  doc.text(titulo.slice(0, 2), M, y)
  y += Math.min(titulo.length, 2) * 6
  fuente(doc, 9, 'normal', TINTA)
  doc.text(d.fecha.charAt(0).toLocaleUpperCase('es-EC') + d.fecha.slice(1), M, y)
  return y + 6
}

function encabezadoTabla(doc: JsPdf, y: number): number {
  doc.setFillColor(...AZUL)
  doc.rect(M, y, FIN - M, ALTO_FILA, 'F')
  fuente(doc, 7, 'bold', BLANCO)
  let x = M
  for (const c of COLUMNAS_REPORTE) {
    doc.text(c.rotulo, c.derecha ? x + c.ancho - 1.5 : x + 1.5, y + 4.3, c.derecha ? { align: 'right' } : undefined)
    x += c.ancho
  }
  return y + ALTO_FILA
}

function filaTabla(doc: JsPdf, f: FilaReporte, y: number, par: boolean) {
  if (par) {
    doc.setFillColor(...FONDO)
    doc.rect(M, y, FIN - M, ALTO_FILA, 'F')
  }
  let x = M
  for (const c of COLUMNAS_REPORTE) {
    const negrita = c.clave === 'guia' || c.clave === 'valor'
    fuente(doc, 8, negrita ? 'bold' : 'normal', c.clave === 'n' ? GRIS : TINTA)
    const texto = ajustar(doc, f[c.clave], c.ancho - 3)
    doc.text(texto, c.derecha ? x + c.ancho - 1.5 : x + 1.5, y + 4.4, c.derecha ? { align: 'right' } : undefined)
    x += c.ancho
  }
  doc.setDrawColor(220, 224, 232)
  doc.setLineWidth(0.15)
  doc.line(M, y + ALTO_FILA, FIN, y + ALTO_FILA)
}

/** Total de guías y valor total, alineados a la derecha bajo la tabla. */
function totales(doc: JsPdf, d: DatosReporte, y: number) {
  const ancho = 80
  const x = FIN - ancho
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.3)
  doc.rect(x, y, ancho, 16, 'S')
  fuente(doc, 8.5, 'normal', GRIS)
  doc.text('Total de guías', x + 3, y + 6)
  doc.text('Valor total', x + 3, y + 12.5)
  fuente(doc, 10, 'bold', TINTA)
  doc.text(d.totalGuias, FIN - 3, y + 6, { align: 'right' })
  fuente(doc, 12, 'bold', AZUL)
  doc.text(d.totalValor, FIN - 3, y + 12.8, { align: 'right' })
}

function pieDePagina(doc: JsPdf, d: DatosReporte) {
  const paginas = doc.getNumberOfPages()
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p)
    fuente(doc, 7, 'normal', GRIS)
    doc.text(`PCargo · ${d.titulo}`, M, ALTO - 8)
    doc.text(`Página ${p} de ${paginas}`, FIN, ALTO - 8, { align: 'right' })
  }
}

/** Dibuja el reporte completo; agrega hojas (repitiendo el encabezado de la tabla) si las guías no caben. */
export function componerReporte(doc: JsPdf, d: DatosReporte, logo: Logo | null): void {
  doc.setProperties({ title: `${d.titulo} - PCargo`, subject: 'Reporte de guías', creator: 'PCargo' })
  let y = encabezadoTabla(doc, cabecera(doc, d, logo))
  d.filas.forEach((f, i) => {
    if (y + ALTO_FILA > LIMITE_FILAS) {
      doc.addPage('a4', 'portrait')
      y = encabezadoTabla(doc, M)
    }
    filaTabla(doc, f, y, i % 2 === 1)
    y += ALTO_FILA
  })
  if (d.filas.length === 0) {
    fuente(doc, 8.5, 'normal', GRIS)
    doc.text('Sin guías en este reporte.', M + 1.5, y + 5)
    y += ALTO_FILA
  }
  if (y + 6 + 16 > LIMITE_FILAS) {
    doc.addPage('a4', 'portrait')
    y = M
  }
  totales(doc, d, y + 6)
  pieDePagina(doc, d)
}

export async function crearReportePdf(
  titulo: string,
  fecha: string,
  envios: Envio[],
): Promise<{ blob: Blob; nombreArchivo: string; titulo: string }> {
  const d = datosReporte(titulo, fecha, envios)
  const [{ jsPDF }, logo] = await Promise.all([import('jspdf'), cargarLogo()])
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  componerReporte(doc, d, logo)
  return { blob: doc.output('blob'), nombreArchivo: d.nombreArchivo, titulo: d.titulo }
}

/**
 * Envía el PDF con el menú de compartir del dispositivo (WhatsApp, correo…). Si el navegador no puede
 * compartir archivos, lo descarga. Devuelve qué pasó; cancelar el menú no es un error.
 */
export async function compartirPdf(pdf: { blob: Blob; nombreArchivo: string; titulo: string }): Promise<'compartido' | 'cancelado' | 'descargado'> {
  const archivo = new File([pdf.blob], pdf.nombreArchivo, { type: 'application/pdf' })
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: pdf.titulo })
      return 'compartido'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelado'
      throw e
    }
  }
  descargarPdf(pdf)
  return 'descargado'
}

export const MENSAJE_ERROR_REPORTE = 'No se pudo generar el reporte en PDF. Intenta de nuevo.'
