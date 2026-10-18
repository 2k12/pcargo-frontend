// Dibujo de la guía imprimible en PDF (A4 vertical). Las dos copias (paquete y entrega) ocupan
// juntas media hoja: una guía sola deja la otra mitad para reutilizarla, y varias guías salen
// dos por hoja.
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
const BLANCO: Rgb = [255, 255, 255]
const AZUL_MARCA: Rgb = [0, 126, 193]

const ANCHO = 210
const ALTO = 297
const MITAD = ALTO / 2
const M = 6 // margen lateral
const ANCHO_UTIL = ANCHO - 2 * M
/** Alto de cada copia (paquete o entrega). */
export const ALTO_COPIA = 69.5
/** Margen hacia el borde de la hoja (zona que la impresora no alcanza) y hacia el corte de la mitad. */
const MARGEN_BORDE = 5
const MARGEN_CORTE = 2
/** Separación entre las dos copias, con su línea de corte en el medio. */
const SEPARACION = MITAD - MARGEN_BORDE - MARGEN_CORTE - 2 * ALTO_COPIA

/** Mitad de la hoja A4 donde se imprimen las dos copias. */
export type MitadHoja = 'superior' | 'inferior'

/** Coordenada Y donde empieza cada copia según la mitad de la hoja. */
export function posicionCopias(mitad: MitadHoja): [number, number] {
  const inicio = mitad === 'superior' ? MARGEN_BORDE : MITAD + MARGEN_CORTE
  return [inicio, inicio + ALTO_COPIA + SEPARACION]
}

/** Isotipo (sin el texto): en la guía «PCargo» va escrito a su derecha. */
export const RUTA_LOGO = '/brand/pcargo-isotipo.svg'

export interface Logo {
  data: string
  ancho: number
  alto: number
}

/** Rasteriza el isotipo SVG a PNG (jsPDF no dibuja SVG). Sin logo, la guía muestra solo el nombre. */
async function cargarLogo(): Promise<Logo | null> {
  try {
    const lado = 512
    const res = await fetch(RUTA_LOGO)
    if (!res.ok) return null
    // Sin tamaño intrínseco algunos navegadores no dibujan el SVG en el canvas: se lo fijamos.
    const svg = (await res.text()).replace('<svg ', `<svg width="${lado}" height="${lado}" `)
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    })
    const canvas = document.createElement('canvas')
    canvas.width = lado
    canvas.height = lado
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, lado, lado)
    return { data: canvas.toDataURL('image/png'), ancho: lado, alto: lado }
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

/** Baja el tamaño de la fuente (hasta `minimo`) para que el texto quepa entero en `max` mm. */
function fuenteQueQuepa(doc: JsPdf, texto: string, max: number, tamano: number, minimo: number) {
  let t = tamano
  doc.setFontSize(t)
  while (t > minimo && doc.getTextWidth(texto) > max) {
    t -= 0.1
    doc.setFontSize(t)
  }
}

/** Texto centrado con espaciado entre letras (jsPDF no descuenta `charSpace` al centrar). */
function textoEspaciado(doc: JsPdf, texto: string, centroX: number, y: number, espacio: number) {
  const ancho = doc.getTextWidth(texto) + espacio * (texto.length - 1)
  doc.text(texto, centroX - ancho / 2, y, { charSpace: espacio })
}

function caja(doc: JsPdf, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.25)
  doc.rect(x, y, w, h, 'S')
}

function etiqueta(doc: JsPdf, texto: string, x: number, y: number, tamano = 5) {
  fuente(doc, tamano, 'bold', AZUL)
  doc.text(texto, x, y)
}

function lineaEscritura(doc: JsPdf, x1: number, x2: number, y: number) {
  doc.setDrawColor(...GRIS)
  doc.setLineWidth(0.15)
  doc.line(x1, y, x2, y)
}

function separadorVertical(doc: JsPdf, x: number, y1: number, y2: number) {
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.2)
  doc.line(x, y1, x, y2)
}

/** Rótulo + valor sobre una línea de escritura (el valor se recorta si no cabe). */
function campo(doc: JsPdf, rotulo: string, valor: string, x: number, xFin: number, y: number, inicioValor: number) {
  etiqueta(doc, rotulo, x, y, 5.6)
  lineaEscritura(doc, x + inicioValor - 1, xFin, y + 0.7)
  if (valor) {
    fuente(doc, 7.5)
    doc.text(ajustar(doc, valor, xFin - x - inicioValor), x + inicioValor, y)
  }
}

function bloqueParte(doc: JsPdf, titulo: string, parte: ParteGuia, x: number, y: number, w: number, h: number) {
  caja(doc, x, y, w, h)
  doc.setFillColor(...AZUL)
  doc.rect(x, y, w, 3.4, 'F')
  fuente(doc, 6.3, 'bold', BLANCO)
  doc.text(titulo, x + 1.5, y + 2.5)
  const fin = x + w - 1.5
  campo(doc, 'Nombre:', parte.nombre, x + 1.5, fin, y + 6.6, 11.5)
  campo(doc, 'Dirección:', parte.direccion, x + 1.5, fin, y + 10, 11.5)
  const medio = x + w * 0.55
  campo(doc, 'Ciudad:', parte.ciudad, x + 1.5, medio - 2, y + 13.4, 11.5)
  campo(doc, 'Teléfono:', parte.telefono, medio, fin, y + 13.4, 10.5)
}

function casilla(doc: JsPdf, x: number, y: number, texto: string, marcada: boolean) {
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.25)
  doc.rect(x, y, 2.1, 2.1, 'S')
  if (marcada) {
    doc.setDrawColor(...TINTA)
    doc.setLineWidth(0.45)
    doc.line(x + 0.35, y + 0.35, x + 1.75, y + 1.75)
    doc.line(x + 1.75, y + 0.35, x + 0.35, y + 1.75)
  }
  fuente(doc, 5.3, marcada ? 'bold' : 'normal', marcada ? TINTA : AZUL)
  doc.text(texto, x + 2.9, y + 1.8)
}

/** REGISTRO | FECHA | HORA | OPERADOR con valores (o en blanco para llenar a mano). */
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
  etiqueta(doc, titulo, x + 1.2, y + h / 2 + 0.8, 5.3)
  const anchos = [17, 11, w - 15 - 28]
  const rotulos = ['FECHA', 'HORA', 'OPERADOR']
  const datos = [valores.fecha, valores.hora, valores.operador]
  let cx = x + 15
  anchos.forEach((cw, i) => {
    separadorVertical(doc, cx, y, y + h)
    etiqueta(doc, rotulos[i]!, cx + 1, y + 2.3, 4.6)
    if (datos[i]) {
      fuente(doc, 6.8)
      doc.text(ajustar(doc, datos[i]!, cw - 2), cx + 1, y + h - 1.3)
    }
    cx += cw
  })
}

function dibujarCopia(doc: JsPdf, d: DatosGuia, indice: 0 | 1, logo: Logo | null, qr: string, T: number) {
  const copia = COPIAS_GUIA[indice]
  const fin = ANCHO - M

  // Banda: rótulo de la copia · rutas · número
  doc.setFillColor(...AZUL)
  doc.rect(M, T, ANCHO_UTIL, 3.6, 'F')
  fuente(doc, 6, 'bold', BLANCO)
  doc.text(copia.titulo, M + 1.5, T + 2.6)
  const anchoTitulo = doc.getTextWidth(copia.titulo)
  fuente(doc, 5.3, 'normal', BLANCO)
  doc.text(` (${copia.detalle})`, M + 1.5 + anchoTitulo, T + 2.6)
  fuente(doc, 6.8, 'bold', BLANCO)
  textoEspaciado(doc, d.ruta, ANCHO / 2, T + 2.7, 0.8)
  fuente(doc, 6, 'bold', BLANCO)
  doc.text(`GUÍA N.º ${d.numero}`, fin - 1.5, T + 2.6, { align: 'right' })

  // Cabecera: logo · datos de la empresa · número y QR
  const cy = T + 3.6
  const ch = 12.5
  caja(doc, M, cy, ANCHO_UTIL, ch)
  // Logo grande con el nombre «PCargo» a su derecha
  const ladoLogo = 11
  let xNombre = M + 2
  if (logo) {
    doc.addImage(logo.data, 'PNG', M + 1.2, cy + (ch - ladoLogo) / 2, ladoLogo, ladoLogo)
    xNombre = M + 1.2 + ladoLogo + 1.5
  }
  fuente(doc, 17, 'bold', AZUL_MARCA)
  doc.text('PCargo', xNombre, cy + ch / 2 + 2.2)
  const inicioCentro = xNombre + doc.getTextWidth('PCargo') + 3
  const gx = 158
  const cxCentro = (inicioCentro + gx) / 2
  const anchoCentro = gx - inicioCentro - 2
  fuente(doc, 8.5, 'bold', AZUL)
  doc.text(EMPRESA_GUIA.servicio, cxCentro, cy + 3.7, { align: 'center' })
  fuente(doc, 5.8, 'normal', TINTA)
  doc.text(ajustar(doc, `${EMPRESA_GUIA.direccion} · ${EMPRESA_GUIA.ciudad}`, anchoCentro), cxCentro, cy + 6.5, { align: 'center' })
  doc.text(EMPRESA_GUIA.telefonos, cxCentro, cy + 8.8, { align: 'center' })
  fuente(doc, 5, 'normal', GRIS)
  doc.text(ajustar(doc, `${d.pie} · Seguimiento: ${d.urlSeguimiento}`, anchoCentro), cxCentro, cy + 11.2, {
    align: 'center',
  })

  separadorVertical(doc, gx, cy, cy + ch)
  const lado = 11
  const qx = fin - lado - 0.5
  doc.addImage(qr, 'PNG', qx, cy + (ch - lado) / 2, lado, lado)
  const centroNumero = (gx + qx) / 2
  fuente(doc, 6.3, 'bold', AZUL)
  textoEspaciado(doc, 'GUÍA', centroNumero, cy + 3.8, 0.8)
  fuente(doc, 14, 'bold', ROJO)
  doc.text(d.numero, centroNumero, cy + 9.8, { align: 'center' })

  // Remitente | Destinatario
  const py = cy + ch + 0.5
  const pw = (ANCHO_UTIL - 2) / 2
  bloqueParte(doc, 'REMITENTE', d.remitente, M, py, pw, 14.5)
  bloqueParte(doc, 'DESTINATARIO', d.destinatario, M + pw + 2, py, pw, 14.5)

  // Avisos en una sola línea
  const avisos = AVISOS_GUIA.join(' · ')
  fuente(doc, 5.3, 'bold', AZUL)
  fuenteQueQuepa(doc, avisos, ANCHO_UTIL, 5.3, 4.2)
  doc.text(avisos, ANCHO / 2, py + 14.5 + 2.2, { align: 'center' })

  // Columna izquierda: piezas, peso y descripción, observaciones, aceptación del remitente
  const iy = py + 14.5 + 3.3
  const iw = 120
  const columnas: [string, string, number][] = [
    ['TOTAL DE PIEZAS', d.piezas.total, 22],
    ['SOBRE(S)', d.piezas.sobres, 17],
    ['VALIJA(S)', d.piezas.valijas, 17],
    ['PAQUETE(S)', d.piezas.paquetes, 19],
    ['CARTÓN(ES)', d.piezas.cartones, 19],
    ['OTROS', d.piezas.otros, iw - 94],
  ]
  let x = M
  for (const [rotulo, valor, w] of columnas) {
    caja(doc, x, iy, w, 8)
    etiqueta(doc, rotulo, x + 1.2, iy + 2.4, 4.8)
    if (valor && rotulo === 'OTROS') {
      // Los tipos sin columna propia pueden ser varios: hasta dos líneas antes de recortar.
      fuente(doc, 5.5, 'bold')
      const lineas = doc.splitTextToSize(valor, w - 2.4) as string[]
      const visibles = lineas.length > 2 ? [lineas[0]!, ajustar(doc, `${lineas[1]}...`, w - 2.4)] : lineas
      doc.text(visibles, x + 1.2, iy + 4.9, { lineHeightFactor: 1.15 })
    } else if (valor) {
      fuente(doc, 9, 'bold')
      doc.text(valor, x + w / 2, iy + 6.6, { align: 'center' })
    }
    x += w
  }

  const dy = iy + 8
  caja(doc, M, dy, 22, 7)
  etiqueta(doc, 'PESO', M + 1.2, dy + 2.4)
  fuente(doc, 8, 'bold')
  doc.text(d.peso, M + 11, dy + 5.9, { align: 'center' })
  caja(doc, M + 22, dy, iw - 22, 7)
  etiqueta(doc, 'DESCRIPCIÓN REAL DEL CONTENIDO', M + 23.2, dy + 2.4)
  if (d.descripcion) {
    fuente(doc, 7.3)
    doc.text(ajustar(doc, d.descripcion, iw - 25), M + 23.2, dy + 5.8)
  }

  const oy = dy + 7
  caja(doc, M, oy, iw, 7)
  etiqueta(doc, 'OBSERVACIONES', M + 1.2, oy + 2.4)
  if (d.referenciaExterna) {
    // Envíos por API: el número de pedido de la empresa, para que lo reconozcan al recibir.
    const rotulo = 'REF. PEDIDO:'
    const x0 = M + iw - 56
    etiqueta(doc, rotulo, x0, oy + 2.4)
    const xValor = x0 + doc.getTextWidth(rotulo) + 1.2
    fuente(doc, 6.5, 'bold')
    doc.text(ajustar(doc, d.referenciaExterna, M + iw - 1.5 - xValor), xValor, oy + 2.4)
  }
  lineaEscritura(doc, M + 1.5, M + iw - 1.5, oy + 6)

  const ry = oy + 7
  const rh = ALTO_COPIA - (ry - T)
  caja(doc, M, ry, iw, rh)
  fuente(doc, 5.2, 'normal', TINTA)
  const aceptacion = doc.splitTextToSize(d.aceptacion, 80) as string[]
  doc.text(aceptacion.slice(0, 3), M + 1.2, ry + 2.5, { lineHeightFactor: 1.2 })
  fuente(doc, 5.2, 'italic', GRIS)
  doc.text(ajustar(doc, d.seguro, 80), M + 1.2, ry + rh - 1.5)
  lineaEscritura(doc, M + 85, M + iw - 2, ry + rh - 4)
  fuente(doc, 5, 'bold', AZUL)
  doc.text('ACEPTO CONDICIONES', (M + 85 + M + iw - 2) / 2, ry + rh - 1.5, { align: 'center' })

  // Columna derecha: uso interno y valor, registro, entrega, recibí conforme
  const dx = M + iw
  const dw = fin - dx
  const uw = 46
  caja(doc, dx, iy, dw, 8)
  separadorVertical(doc, dx + uw, iy, iy + 8)
  etiqueta(doc, 'USO INTERNO', dx + 1.2, iy + 2.4)
  if (d.zona) {
    fuente(doc, 5.3, 'bold', TINTA)
    doc.text(d.zona, dx + uw - 1.2, iy + 2.4, { align: 'right' })
  }
  d.pago.forEach((p, i) => {
    casilla(doc, dx + 1.2 + (i % 2) * 22, iy + 3.1 + Math.floor(i / 2) * 2.5, p.etiqueta, p.marcada)
  })
  etiqueta(doc, 'VALOR USD', dx + uw + 1.2, iy + 2.4)
  fuente(doc, 10, 'bold')
  doc.text(ajustar(doc, d.valor, dw - uw - 2.4), fin - 1.5, iy + 6.8, { align: 'right' })

  filaGestion(doc, 'REGISTRO', d.registro, dx, iy + 8, dw, 6.5)
  filaGestion(doc, 'ENTREGA', d.entrega, dx, iy + 14.5, dw, 6.5)

  const ey = iy + 21
  const eh = ALTO_COPIA - (ey - T)
  caja(doc, dx, ey, dw, eh)
  etiqueta(doc, 'RECIBÍ CONFORME', dx + 1.2, ey + 2.5, 5.8)
  campo(doc, 'NOMBRE:', d.entrega.recibidoPor, dx + 1.2, fin - 1.5, ey + 5.9, 10)
  doc.setDrawColor(...TINTA)
  doc.setLineWidth(0.25)
  doc.line(dx + 5, ey + eh - 2.6, fin - 5, ey + eh - 2.6)
  fuente(doc, 4.8, 'bold', AZUL)
  doc.text('FIRMA DE QUIEN RECIBE', dx + dw / 2, ey + eh - 0.8, { align: 'center' })
}

/** Línea de corte punteada con una tijera dibujada (las fuentes estándar no tienen el símbolo). */
function lineaCorte(doc: JsPdf, y: number) {
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

async function cargarRecursos() {
  const [{ jsPDF }, qrMod, logo] = await Promise.all([import('jspdf'), import('qrcode'), cargarLogo()])
  const QR = qrMod.default ?? qrMod
  const qrDe = (url: string) =>
    QR.toDataURL(url, { errorCorrectionLevel: 'M', margin: 0, width: 300, color: { dark: '#1b2a59', light: '#ffffff' } })
  return { jsPDF, qrDe, logo }
}

/** Orden de impresión de varias guías: por número, de menor a mayor. */
export function ordenarParaImprimir<T extends Pick<Envio, 'numeroGuia'>>(envios: T[]): T[] {
  return [...envios].sort((a, b) => a.numeroGuia - b.numeroGuia)
}

/** Hoja (desde 0) y mitad donde va la guía `i` al imprimir varias: dos guías por hoja. */
export function ubicacionGuia(i: number): { hoja: number; mitad: MitadHoja } {
  return { hoja: Math.floor(i / 2), mitad: i % 2 === 0 ? 'superior' : 'inferior' }
}

/** «guias-0040461-0040470.pdf» para varias guías (ya ordenadas). */
export function nombreArchivoGuias(datos: Pick<DatosGuia, 'numero' | 'nombreArchivo'>[]): string {
  if (datos.length === 1) return datos[0]!.nombreArchivo
  return `guias-${datos[0]!.numero}-${datos[datos.length - 1]!.numero}.pdf`
}

/**
 * Genera el PDF de una o varias guías. Una guía sola va en la mitad elegida; varias se organizan
 * dos por hoja (cada una con su copia paquete y su copia entrega).
 */
export async function crearGuiasPdf(
  envios: Envio[],
  { origen, mitad = 'superior' }: { origen?: string; mitad?: MitadHoja } = {},
): Promise<{ blob: Blob; nombreArchivo: string }> {
  if (envios.length === 0) throw new Error('No hay guías para imprimir')
  const datos = ordenarParaImprimir(envios).map((e) => datosGuia(e, origen))
  const { jsPDF, qrDe, logo } = await cargarRecursos()
  const qrs = await Promise.all(datos.map((d) => qrDe(d.urlSeguimiento)))

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  datos.forEach((d, i) => {
    const { hoja, mitad: m } = datos.length === 1 ? { hoja: 0, mitad } : ubicacionGuia(i)
    if (hoja > 0 && m === 'superior') doc.addPage('a4', 'portrait')
    componerGuia(doc, d, logo, qrs[i]!, m)
  })
  if (datos.length > 1) {
    doc.setProperties({ title: `Guías ${datos[0]!.numero} a ${datos[datos.length - 1]!.numero} - PCargo` })
  }
  return { blob: doc.output('blob'), nombreArchivo: nombreArchivoGuias(datos) }
}

/** Genera el PDF de una guía (dos copias en media hoja A4). */
export function crearGuiaPdf(envio: Envio, origen?: string, mitad: MitadHoja = 'superior') {
  return crearGuiasPdf([envio], { origen, mitad })
}

/**
 * Dibuja las dos copias en la mitad indicada de un A4 ya creado, con la línea de corte entre
 * ambas y la del centro de la hoja. La otra mitad queda en blanco para otra guía.
 */
export function componerGuia(doc: JsPdf, d: DatosGuia, logo: Logo | null, qr: string, mitad: MitadHoja = 'superior'): void {
  doc.setProperties({ title: `Guía ${d.numero} - PCargo`, subject: 'Guía de encomienda', creator: 'PCargo' })
  const [y0, y1] = posicionCopias(mitad)
  dibujarCopia(doc, d, 0, logo, qr, y0)
  lineaCorte(doc, y0 + ALTO_COPIA + SEPARACION / 2)
  dibujarCopia(doc, d, 1, logo, qr, y1)
  lineaCorte(doc, MITAD)
}

const CLAVE_MITAD = 'pcargo.guia.mitad'

/** Mitad de la hoja elegida la última vez (por defecto, la superior). */
export function leerMitadGuia(): MitadHoja {
  try {
    return localStorage.getItem(CLAVE_MITAD) === 'inferior' ? 'inferior' : 'superior'
  } catch {
    return 'superior'
  }
}

export function guardarMitadGuia(mitad: MitadHoja): void {
  try {
    localStorage.setItem(CLAVE_MITAD, mitad)
  } catch {
    // Sin almacenamiento: se usa la mitad superior.
  }
}

/** Descarga el PDF (`guia-0040461.pdf`). */
export function descargarPdf({ blob, nombreArchivo }: { blob: Blob; nombreArchivo: string }): void {
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
export function imprimirPdf({ blob, nombreArchivo }: { blob: Blob; nombreArchivo: string }): void {
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

/** Imprime o descarga la guía en la mitad elegida (por defecto, la última que se usó). */
export async function generarGuia(envio: Envio, accion: AccionGuia, mitad: MitadHoja = leerMitadGuia()): Promise<void> {
  const pdf = await crearGuiaPdf(envio, undefined, mitad)
  if (accion === 'imprimir') imprimirPdf(pdf)
  else descargarPdf(pdf)
}

/** Imprime o descarga varias guías organizadas dos por hoja. */
export async function generarGuias(envios: Envio[], accion: AccionGuia): Promise<void> {
  const pdf = await crearGuiasPdf(envios)
  if (accion === 'imprimir') imprimirPdf(pdf)
  else descargarPdf(pdf)
}
