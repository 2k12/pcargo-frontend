// Dibujo de la guía imprimible en PDF (A4 vertical, dos copias iguales con línea de corte).
// jsPDF y qrcode se cargan con import() dinámico: solo se descargan al imprimir una guía.
// Los textos vienen ya formateados de `datosGuia` (lógica pura y testeada).
import type { jsPDF as JsPdf } from 'jspdf'
import type { Envio } from '@/types/api'
import { AVISOS_GUIA, COPIAS_GUIA, datosGuia, EMPRESA_GUIA, type DatosGuia, type ParteGuia } from './guiaImprimible'

type Rgb = [number, number, number]
// Azul marino sobre blanco, como la guía de imprenta; se imprime bien en blanco y negro.
const AZUL: Rgb = [27, 42, 89]
const ROJO: Rgb = [200, 16, 46]
const TINTA: Rgb = [25, 25, 25]
const GRIS: Rgb = [110, 110, 110]

const ANCHO = 210
const ALTO = 297
const MITAD = ALTO / 2
const M = 8 // margen lateral
const ANCHO_UTIL = ANCHO - 2 * M

export const RUTA_LOGO = '/brand/pcargo-logo-original.png'

export interface Logo {
  data: string
  ancho: number
  alto: number
}

async function cargarLogo(): Promise<Logo | null> {
  try {
    const res = await fetch(RUTA_LOGO)
    if (!res.ok) return null
    const blob = await res.blob()
    const data = await new Promise<string>((resolve, reject) => {
      const lector = new FileReader()
      lector.onload = () => resolve(String(lector.result))
      lector.onerror = () => reject(lector.error)
      lector.readAsDataURL(blob)
    })
    const { ancho, alto } = await new Promise<{ ancho: number; alto: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ ancho: img.naturalWidth, alto: img.naturalHeight })
      img.onerror = reject
      img.src = data
    })
    return ancho && alto ? { data, ancho, alto } : null
  } catch {
    return null
  }
}

/** Recorta el texto con «...» para que quepa en `max` mm con la fuente actual. */
function ajustar(doc: JsPdf, texto: string, max: number): string {
  if (doc.getTextWidth(texto) <= max) return texto
  let t = texto
  while (t.length > 1 && doc.getTextWidth(`${t}...`) > max) t = t.slice(0, -1)
  return `${t.trimEnd()}...`
}

function fuente(doc: JsPdf, tamano: number, estilo: 'normal' | 'bold' | 'italic' = 'normal', color: Rgb = TINTA) {
  doc.setFont('helvetica', estilo)
  doc.setFontSize(tamano)
  doc.setTextColor(...color)
}

/** Texto centrado con espaciado entre letras (jsPDF no descuenta `charSpace` al centrar). */
function textoEspaciado(doc: JsPdf, texto: string, centroX: number, y: number, espacio: number) {
  const ancho = doc.getTextWidth(texto) + espacio * (texto.length - 1)
  doc.text(texto, centroX - ancho / 2, y, { charSpace: espacio })
}

function caja(doc: JsPdf, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.3)
  doc.rect(x, y, w, h, 'S')
}

function etiqueta(doc: JsPdf, texto: string, x: number, y: number, tamano = 6) {
  fuente(doc, tamano, 'bold', AZUL)
  doc.text(texto, x, y)
}

function lineaEscritura(doc: JsPdf, x1: number, x2: number, y: number) {
  doc.setDrawColor(...GRIS)
  doc.setLineWidth(0.15)
  doc.line(x1, y, x2, y)
}

function bloqueParte(doc: JsPdf, titulo: string, parte: ParteGuia, x: number, y: number, w: number, h: number) {
  caja(doc, x, y, w, h)
  doc.setFillColor(...AZUL)
  doc.rect(x, y, w, 4.5, 'F')
  fuente(doc, 7.5, 'bold', [255, 255, 255])
  doc.text(titulo, x + 2, y + 3.3)
  const filas: [string, string][] = [
    ['Nombre:', parte.nombre],
    ['Dirección:', parte.direccion],
    ['Ciudad:', parte.ciudad],
    ['Teléfono:', parte.telefono],
  ]
  filas.forEach(([rotulo, valor], i) => {
    const fy = y + 9.3 + i * 4.8
    etiqueta(doc, rotulo, x + 2, fy, 6.5)
    lineaEscritura(doc, x + 16, x + w - 2, fy + 0.9)
    if (valor) {
      fuente(doc, 8.5)
      doc.text(ajustar(doc, valor, w - 19), x + 17, fy)
    }
  })
}

function casilla(doc: JsPdf, x: number, y: number, texto: string, marcada: boolean) {
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.3)
  doc.rect(x, y, 3, 3, 'S')
  if (marcada) {
    doc.setDrawColor(...TINTA)
    doc.setLineWidth(0.5)
    doc.line(x + 0.5, y + 0.5, x + 2.5, y + 2.5)
    doc.line(x + 2.5, y + 0.5, x + 0.5, y + 2.5)
  }
  fuente(doc, 6.5, marcada ? 'bold' : 'normal', marcada ? TINTA : AZUL)
  doc.text(texto, x + 4.2, y + 2.4)
}

/** FECHA | HORA | OPERADOR con valores (o en blanco para llenar a mano). */
function filaGestion(
  doc: JsPdf,
  titulo: string,
  valores: { fecha: string; hora: string; operador: string },
  x: number,
  y: number,
  w: number,
  h: number,
) {
  caja(doc, x, y, w, h)
  etiqueta(doc, titulo, x + 1.5, y + 2.8)
  const anchos = [20, 13, w - 33]
  const rotulos = ['FECHA', 'HORA', 'OPERADOR']
  const datos = [valores.fecha, valores.hora, valores.operador]
  let cx = x
  anchos.forEach((cw, i) => {
    if (i > 0) {
      doc.setDrawColor(...AZUL)
      doc.setLineWidth(0.2)
      doc.line(cx, y + 3.8, cx, y + h)
    }
    etiqueta(doc, rotulos[i]!, cx + 1.2, y + 6, 5.5)
    if (datos[i]) {
      fuente(doc, 7.5)
      doc.text(ajustar(doc, datos[i]!, cw - 2.4), cx + 1.2, y + h - 2)
    }
    cx += cw
  })
}

function dibujarCopia(doc: JsPdf, d: DatosGuia, indice: 0 | 1, logo: Logo | null, qr: string) {
  const T = indice * MITAD
  const copia = COPIAS_GUIA[indice]

  // Rótulo de la copia
  fuente(doc, 7.5, 'bold', AZUL)
  doc.text(copia.titulo, M, T + 5.5)
  const anchoTitulo = doc.getTextWidth(copia.titulo)
  fuente(doc, 7, 'normal', GRIS)
  doc.text(` (${copia.detalle})`, M + anchoTitulo, T + 5.5)
  fuente(doc, 7, 'bold', AZUL)
  doc.text(`GUÍA N.º ${d.numero}`, ANCHO - M, T + 5.5, { align: 'right' })

  // Banda superior
  doc.setFillColor(...AZUL)
  doc.rect(M, T + 7, ANCHO_UTIL, 6, 'F')
  fuente(doc, 8, 'bold', [255, 255, 255])
  textoEspaciado(doc, EMPRESA_GUIA.banda, ANCHO / 2, T + 11.2, 0.9)

  // Cabecera: logo · datos de la empresa · número y QR
  const cy = T + 15
  const ch = 27
  caja(doc, M, cy, ANCHO_UTIL, ch)
  if (logo) {
    const alto = 22
    const ancho = Math.min(36, (alto * logo.ancho) / logo.alto)
    const altoReal = (ancho * logo.alto) / logo.ancho
    doc.addImage(logo.data, 'PNG', M + 2, cy + (ch - altoReal) / 2, ancho, altoReal)
  } else {
    fuente(doc, 16, 'bold', AZUL)
    doc.text('PCargo', M + 4, cy + 15)
  }
  const cxCentro = (M + 40 + 160) / 2
  fuente(doc, 10.5, 'bold', AZUL)
  doc.text(EMPRESA_GUIA.servicio, cxCentro, cy + 7, { align: 'center' })
  fuente(doc, 7.5, 'normal', TINTA)
  doc.text(EMPRESA_GUIA.direccion, cxCentro, cy + 13, { align: 'center' })
  doc.text(EMPRESA_GUIA.telefonos, cxCentro, cy + 17.5, { align: 'center' })
  fuente(doc, 8, 'bold', AZUL)
  doc.text(EMPRESA_GUIA.ciudad, cxCentro, cy + 22.5, { align: 'center' })

  const gx = 160
  const gw = ANCHO - M - gx
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.3)
  doc.line(gx, cy, gx, cy + ch)
  fuente(doc, 8, 'bold', AZUL)
  textoEspaciado(doc, 'GUÍA', gx + gw / 2, cy + 4, 1)
  fuente(doc, 15, 'bold', ROJO)
  doc.text(d.numero, gx + gw / 2, cy + 10.2, { align: 'center' })
  const lado = 14
  doc.addImage(qr, 'PNG', gx + (gw - lado) / 2, cy + 11.8, lado, lado)

  // Remitente | Destinatario
  const py = T + 44
  bloqueParte(doc, 'REMITENTE', d.remitente, M, py, 96, 25)
  bloqueParte(doc, 'DESTINATARIO', d.destinatario, M + 98, py, ANCHO_UTIL - 98, 25)

  // Avisos
  fuente(doc, 6.5, 'bold', AZUL)
  doc.text(AVISOS_GUIA[0], ANCHO / 2, T + 72.4, { align: 'center' })
  doc.text(AVISOS_GUIA[1], ANCHO / 2, T + 75.8, { align: 'center' })

  // Piezas
  const fy = T + 78
  const columnas: [string, string, number][] = [
    ['TOTAL DE PIEZAS', d.piezas.total, 30],
    ['SOBRE(S)', d.piezas.sobres, 28],
    ['VALIJA(S)', d.piezas.valijas, 28],
    ['PAQUETE(S)', d.piezas.paquetes, 28],
    ['CARTÓN(ES)', d.piezas.cartones, 28],
    ['OTROS', d.piezas.otros, ANCHO_UTIL - 142],
  ]
  let x = M
  for (const [rotulo, valor, w] of columnas) {
    caja(doc, x, fy, w, 10)
    etiqueta(doc, rotulo, x + 1.5, fy + 3)
    if (valor) {
      const otros = rotulo === 'OTROS'
      fuente(doc, otros ? 7.5 : 10, 'bold')
      doc.text(ajustar(doc, valor, w - 3), otros ? x + 1.5 : x + w / 2, fy + 8, { align: otros ? 'left' : 'center' })
    }
    x += w
  }

  // Peso | Descripción
  const dy = fy + 10
  caja(doc, M, dy, 30, 9)
  etiqueta(doc, 'PESO', M + 1.5, dy + 3)
  fuente(doc, 9, 'bold')
  doc.text(d.peso, M + 15, dy + 7.4, { align: 'center' })
  caja(doc, M + 30, dy, ANCHO_UTIL - 30, 9)
  etiqueta(doc, 'DESCRIPCIÓN REAL DEL CONTENIDO', M + 31.5, dy + 3)
  if (d.descripcion) {
    fuente(doc, 8)
    doc.text(ajustar(doc, d.descripcion, ANCHO_UTIL - 33), M + 31.5, dy + 7.4)
  }

  // Columna izquierda: observaciones, aceptación del remitente, recibí conforme
  const iy = dy + 9 // T + 97
  const iw = 124
  caja(doc, M, iy, iw, 12)
  etiqueta(doc, 'OBSERVACIONES', M + 1.5, iy + 3)
  lineaEscritura(doc, M + 2, M + iw - 2, iy + 7)
  lineaEscritura(doc, M + 2, M + iw - 2, iy + 10.8)

  const ry = iy + 12
  caja(doc, M, ry, iw, 13)
  fuente(doc, 5.8, 'normal', TINTA)
  const aceptacion = doc.splitTextToSize(d.aceptacion, 78) as string[]
  doc.text(aceptacion.slice(0, 3), M + 1.5, ry + 2.8, { lineHeightFactor: 1.25 })
  fuente(doc, 5.8, 'italic', GRIS)
  doc.text(ajustar(doc, d.seguro, 78), M + 1.5, ry + 11.5)
  lineaEscritura(doc, M + 84, M + iw - 3, ry + 8.6)
  fuente(doc, 5.8, 'bold', AZUL)
  doc.text('ACEPTO CONDICIONES', (M + 84 + M + iw - 3) / 2, ry + 11.3, { align: 'center' })

  const ey = ry + 13
  const eh = 46 - 12 - 13 // hasta T + 143
  caja(doc, M, ey, iw, eh)
  etiqueta(doc, 'RECIBÍ CONFORME', M + 1.5, ey + 3.3, 7)
  etiqueta(doc, 'NOMBRE:', M + 1.5, ey + 8.5, 6.5)
  lineaEscritura(doc, M + 13, M + iw - 2, ey + 9.3)
  if (d.entrega.recibidoPor) {
    fuente(doc, 8.5)
    doc.text(ajustar(doc, d.entrega.recibidoPor, iw - 16), M + 14, ey + 8.5)
  }
  doc.setDrawColor(...TINTA)
  doc.setLineWidth(0.3)
  doc.line(M + 6, ey + 17.3, M + iw - 6, ey + 17.3)
  fuente(doc, 5.8, 'bold', AZUL)
  doc.text('FIRMA DE QUIEN RECIBE', M + iw / 2, ey + 19.8, { align: 'center' })

  // Columna derecha: uso interno, valor, registro y entrega
  const dx = M + iw
  const dw = ANCHO - M - dx
  caja(doc, dx, iy, dw, 12)
  etiqueta(doc, 'USO INTERNO', dx + 1.5, iy + 3)
  if (d.zona) {
    fuente(doc, 6.5, 'bold', TINTA)
    doc.text(d.zona, dx + dw - 1.5, iy + 3, { align: 'right' })
  }
  d.pago.forEach((p, i) => {
    casilla(doc, dx + 2 + (i % 2) * (dw / 2), iy + 4.4 + Math.floor(i / 2) * 3.7, p.etiqueta, p.marcada)
  })

  const vy = iy + 12
  caja(doc, dx, vy, dw, 8)
  etiqueta(doc, 'VALOR USD', dx + 1.5, vy + 5.2, 6.5)
  fuente(doc, 11, 'bold')
  doc.text(d.valor, dx + dw - 2, vy + 5.7, { align: 'right' })

  filaGestion(doc, 'REGISTRO', d.registro, dx, vy + 8, dw, 11)
  filaGestion(doc, 'ENTREGA', d.entrega, dx, vy + 19, dw, 46 - 12 - 8 - 11)

  // Pie
  fuente(doc, 5.5, 'normal', GRIS)
  doc.text(`${d.pie} · Seguimiento: ${d.urlSeguimiento}`, ANCHO / 2, T + 146.2, { align: 'center' })
}

/** Línea de corte punteada con una tijera dibujada (las fuentes estándar no tienen el símbolo). */
function lineaCorte(doc: JsPdf) {
  const y = MITAD
  doc.setDrawColor(...GRIS)
  doc.setLineWidth(0.25)
  doc.setLineDashPattern([1.5, 1.2], 0)
  doc.line(M + 8, y, ANCHO - M, y)
  doc.setLineDashPattern([], 0)
  const x = M + 1
  doc.setLineWidth(0.3)
  doc.circle(x, y - 1.3, 0.8, 'S')
  doc.circle(x, y + 1.3, 0.8, 'S')
  doc.line(x + 0.6, y - 0.8, x + 5, y + 1)
  doc.line(x + 0.6, y + 0.8, x + 5, y - 1)
}

/** Genera el PDF de la guía (dos copias en una hoja A4). */
export async function crearGuiaPdf(envio: Envio, origen?: string): Promise<{ blob: Blob; nombreArchivo: string }> {
  const d = datosGuia(envio, origen)
  const [{ jsPDF }, qrMod, logo] = await Promise.all([import('jspdf'), import('qrcode'), cargarLogo()])
  const QR = qrMod.default ?? qrMod
  const qr = await QR.toDataURL(d.urlSeguimiento, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 300,
    color: { dark: '#1b2a59', light: '#ffffff' },
  })

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  componerGuia(doc, d, logo, qr)
  return { blob: doc.output('blob'), nombreArchivo: d.nombreArchivo }
}

/** Dibuja las dos copias y la línea de corte en un documento A4 ya creado. */
export function componerGuia(doc: JsPdf, d: DatosGuia, logo: Logo | null, qr: string): void {
  doc.setProperties({ title: `Guía ${d.numero} - PCargo`, subject: 'Guía de encomienda', creator: 'PCargo' })
  dibujarCopia(doc, d, 0, logo, qr)
  lineaCorte(doc)
  dibujarCopia(doc, d, 1, logo, qr)
}

/** Descarga `guia-0040461.pdf`. */
export async function descargarGuiaPdf(envio: Envio): Promise<void> {
  const { blob, nombreArchivo } = await crearGuiaPdf(envio)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Abre el diálogo de impresión con la guía. En escritorio se imprime desde un iframe oculto;
 * si el navegador no lo permite (p. ej. en el celular), se abre el PDF en otra pestaña.
 */
export async function imprimirGuiaPdf(envio: Envio): Promise<void> {
  const { blob, nombreArchivo } = await crearGuiaPdf(envio)
  const url = URL.createObjectURL(blob)
  const abrirPestana = () => {
    if (!window.open(url, '_blank')) {
      // Ventanas emergentes bloqueadas: se descarga como último recurso.
      const a = document.createElement('a')
      a.href = url
      a.download = nombreArchivo
      a.click()
    }
  }
  const esMovil = window.matchMedia?.('(pointer: coarse)').matches
  if (esMovil) {
    abrirPestana()
    setTimeout(() => URL.revokeObjectURL(url), 120_000)
    return
  }
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  iframe.title = 'Guía para imprimir'
  iframe.src = url
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch {
      abrirPestana()
    }
  }
  document.body.appendChild(iframe)
  setTimeout(() => {
    iframe.remove()
    URL.revokeObjectURL(url)
  }, 120_000)
}

export type AccionGuia = 'imprimir' | 'descargar'

export const MENSAJE_ERROR_GUIA = 'No se pudo generar la guía en PDF. Intenta de nuevo.'

export function generarGuia(envio: Envio, accion: AccionGuia): Promise<void> {
  return accion === 'imprimir' ? imprimirGuiaPdf(envio) : descargarGuiaPdf(envio)
}
