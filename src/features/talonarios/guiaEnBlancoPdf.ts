// Guías en blanco de un talonario (contrato v20): el mismo talón de la guía normal (cuatro por hoja A4,
// con número, QR, logo y datos de PCargo), pero con los campos vacíos y líneas para llenarlos a mano en
// carretera. Reutiliza el dibujo de `envios/guiaPdf.ts`; la guía de un envío no cambia.
import type { jsPDF as JsPdf } from 'jspdf'
import { CASILLAS_PAGO, type ParteGuia } from '@/features/envios/guiaImprimible'
import {
  ALTO_ENCABEZADO,
  ALTO_GUIA,
  ANCHO_TALON,
  AZUL,
  bloqueParte,
  caja,
  campo,
  cargarRecursos,
  casilla,
  descargarPdf,
  dibujarAvisos,
  dibujarEncabezado,
  etiqueta,
  filaGestion,
  FIN,
  fuente,
  GRIS,
  imprimirPdf,
  lineaEscritura,
  lineasDeCorte,
  lineasHasta,
  posicionGuia,
  separadorVertical,
  TINTA,
  ubicacionGuia,
  X_TALON,
  type AccionGuia,
  type Logo,
} from '@/features/envios/guiaPdf'
import { datosGuiaEnBlanco, nombreArchivoTalonario, type DatosGuiaEnBlanco } from './domain'

const PARTE_VACIA: ParteGuia = { nombre: '', direccion: '', ciudad: '', telefono: '' }
const SIN_GESTION = { fecha: '', hora: '', operador: '' }

/** Columnas de la tabla de piezas (como en la guía física), para marcar cantidad y peso a mano. */
export const COLUMNAS_PIEZAS = ['SOBRE(S)', 'PAQUETE(S)', 'CARTÓN(ES)', 'VALIJA(S)', 'OTROS'] as const
export const FILAS_PIEZAS = ['CANTIDAD', 'PESO (kg)'] as const

/** Fecha para escribir a mano: ___ / ___ / _____ */
function fechaAMano(doc: JsPdf, x: number, y: number) {
  const tramos: [number, number][] = [
    [0, 6],
    [8.5, 14.5],
    [17, 27],
  ]
  tramos.forEach(([a, b], i) => {
    lineaEscritura(doc, x + a, x + b, y)
    if (i < tramos.length - 1) {
      fuente(doc, 6, 'normal', GRIS)
      doc.text('/', x + b + 1.2, y - 0.3)
    }
  })
}

/** Talón en blanco: mismas partes que la guía de un envío, sin datos. */
function dibujarTalonEnBlanco(doc: JsPdf, d: DatosGuiaEnBlanco, logo: Logo | null, qr: string, T: number) {
  const x0 = X_TALON
  const fin = FIN
  dibujarEncabezado(doc, { numero: d.numero, ruta: d.marca, urlSeguimiento: d.urlSeguimiento }, logo, qr, T, { rutaEspaciada: false })

  // Remitente | Destinatario (nombre, dirección, ciudad y teléfono con líneas para escribir)
  const py = T + ALTO_ENCABEZADO + 0.5
  const pw = (ANCHO_TALON - 2) / 2
  bloqueParte(doc, 'REMITENTE', PARTE_VACIA, x0, py, pw, 14.5)
  bloqueParte(doc, 'DESTINATARIO', PARTE_VACIA, x0 + pw + 2, py, pw, 14.5)
  dibujarAvisos(doc, py + 14.5 + 2.1)

  // Columna izquierda: ruta, piezas, descripción y aceptación del remitente
  const iy = py + 14.5 + 3
  const iw = 120
  caja(doc, x0, iy, iw, 5.5)
  etiqueta(doc, 'RUTA', x0 + 1, iy + 3.7, 4.6)
  campo(doc, 'ORIGEN:', '', x0 + 9, x0 + 62, iy + 3.7, 9.5)
  campo(doc, 'DESTINO:', '', x0 + 64, x0 + iw - 1.5, iy + 3.7, 10.5)

  const ty = iy + 5.5
  const altoCabecera = 3
  const altoFila = 4.2
  const altoTabla = altoCabecera + FILAS_PIEZAS.length * altoFila
  const anchoRotulo = 18
  const anchos = [18, 18, 18, 18, iw - anchoRotulo - 72]
  caja(doc, x0, ty, iw, altoTabla)
  let cx = x0 + anchoRotulo
  COLUMNAS_PIEZAS.forEach((rotulo, i) => {
    separadorVertical(doc, cx, ty, ty + altoTabla)
    etiqueta(doc, rotulo, cx + 1, ty + 2.2, 4.2)
    cx += anchos[i]!
  })
  FILAS_PIEZAS.forEach((rotulo, i) => {
    const fy = ty + altoCabecera + i * altoFila
    doc.setDrawColor(...AZUL)
    doc.setLineWidth(0.2)
    doc.line(x0, fy, x0 + iw, fy)
    etiqueta(doc, rotulo, x0 + 1, fy + 2.8, 4.2)
  })

  const dy = ty + altoTabla
  caja(doc, x0, dy, iw, 5.5)
  etiqueta(doc, 'DESCRIPCIÓN REAL DEL CONTENIDO', x0 + 1, dy + 2.2, 4.4)
  lineaEscritura(doc, x0 + 1.2, x0 + iw - 1.2, dy + 4.7)

  const ry = dy + 5.5
  const rh = ALTO_GUIA - (ry - T)
  caja(doc, x0, ry, iw, rh)
  fuente(doc, 4.6, 'normal', TINTA)
  const aceptacion = `El remitente al firmar este documento acepta en todas sus partes las condiciones de transporte publicadas en ${d.urlTerminos}`
  doc.text(lineasHasta(doc, aceptacion, iw - 2.4, 2), x0 + 1.2, ry + 2.3, { lineHeightFactor: 1.15 })
  fuente(doc, 4.4, 'italic', GRIS)
  doc.text(lineasHasta(doc, 'Agradecemos tomar seguro por la mercadería arriba declarada.', 46, 2), x0 + 1.2, ry + rh - 3.6, {
    lineHeightFactor: 1.15,
  })
  lineaEscritura(doc, x0 + 50, x0 + iw - 2, ry + rh - 3.4)
  fuente(doc, 4.4, 'bold', AZUL)
  doc.text('ACEPTO CONDICIONES (REMITENTE)', (x0 + 50 + x0 + iw - 2) / 2, ry + rh - 1.2, { align: 'center' })

  // Columna derecha: forma de pago y valor, fecha de la guía, entrega y recibí conforme
  const dx = x0 + iw
  const dw = fin - dx
  const vx = dx + 30
  caja(doc, dx, iy, dw, 8)
  separadorVertical(doc, vx, iy, iy + 8)
  etiqueta(doc, 'FORMA DE PAGO', dx + 1, iy + 2.3, 4.2)
  CASILLAS_PAGO.forEach((c, i) => {
    casilla(doc, dx + 1 + (i % 2) * 14, iy + 3.1 + Math.floor(i / 2) * 2.5, c.etiqueta, false)
  })
  etiqueta(doc, 'VALOR USD', vx + 1, iy + 2.3, 4.2)
  fuente(doc, 8, 'bold', AZUL)
  doc.text('$', vx + 2, iy + 6.8)
  lineaEscritura(doc, vx + 5, fin - 2, iy + 7)

  const fy = iy + 8
  caja(doc, dx, fy, dw, 6.5)
  etiqueta(doc, 'FECHA DE LA GUÍA', dx + 1, fy + 2.1, 4)
  fechaAMano(doc, dx + 2, fy + 5.4)
  separadorVertical(doc, dx + 33, fy, fy + 6.5)
  etiqueta(doc, 'HORA', dx + 33.8, fy + 2.1, 4)
  separadorVertical(doc, dx + 44, fy, fy + 6.5)
  etiqueta(doc, 'OPERADOR', dx + 44.8, fy + 2.1, 4)

  filaGestion(doc, 'ENTREGA', SIN_GESTION, dx, iy + 14.5, dw, 6.5)

  const ey = iy + 21
  const eh = ALTO_GUIA - (ey - T)
  caja(doc, dx, ey, dw, eh)
  etiqueta(doc, 'RECIBÍ CONFORME', dx + 1, ey + 2.4, 5.2)
  campo(doc, 'NOMBRE:', '', dx + 1, fin - 1.2, ey + 5.9, 10.5)
  doc.setDrawColor(...TINTA)
  doc.setLineWidth(0.25)
  doc.line(dx + 4, ey + eh - 2.6, fin - 4, ey + eh - 2.6)
  fuente(doc, 4.4, 'bold', AZUL)
  doc.text('FIRMA DE QUIEN RECIBE', dx + dw / 2, ey + eh - 0.8, { align: 'center' })
}

/**
 * Dibuja las guías en blanco en un A4 ya creado: cuatro por hoja, de arriba abajo, con sus líneas de corte;
 * agrega las hojas que hagan falta.
 */
export function componerGuiasEnBlanco(doc: JsPdf, datos: DatosGuiaEnBlanco[], logo: Logo | null, qrs: string[]): void {
  datos.forEach((d, i) => {
    const { hoja, posicion } = ubicacionGuia(i)
    if (hoja > 0 && posicion === 0) doc.addPage('a4', 'portrait')
    dibujarTalonEnBlanco(doc, d, logo, qrs[i]!, posicionGuia(posicion))
    lineasDeCorte(doc, posicion)
  })
}

/** PDF con las guías en blanco de esos números (ordenadas), cuatro por hoja. */
export async function crearGuiasEnBlancoPdf(
  numeros: number[],
  { nota, origen }: { nota?: string | null; origen?: string } = {},
): Promise<{ blob: Blob; nombreArchivo: string }> {
  if (numeros.length === 0) throw new Error('No hay guías disponibles para imprimir')
  const datos = [...numeros].sort((a, b) => a - b).map((n) => datosGuiaEnBlanco(n, nota, origen))
  const { jsPDF, qrDe, logo } = await cargarRecursos()
  const qrs = await Promise.all(datos.map((d) => qrDe(d.urlSeguimiento)))
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  componerGuiasEnBlanco(doc, datos, logo, qrs)
  const ultimo = datos[datos.length - 1]!
  doc.setProperties({
    title: `Talonario ${datos[0]!.numero}${datos.length > 1 ? ` a ${ultimo.numero}` : ''} - PCargo`,
    subject: 'Guías en blanco',
    creator: 'PCargo',
  })
  return { blob: doc.output('blob'), nombreArchivo: nombreArchivoTalonario(numeros) }
}

export const MENSAJE_ERROR_TALONARIO = 'No se pudieron generar las guías en PDF. Intenta de nuevo.'

/** Imprime o descarga las guías en blanco. */
export async function generarGuiasEnBlanco(numeros: number[], nota: string | null | undefined, accion: AccionGuia): Promise<void> {
  const pdf = await crearGuiasEnBlancoPdf(numeros, { nota })
  if (accion === 'imprimir') imprimirPdf(pdf)
  else descargarPdf(pdf)
}
