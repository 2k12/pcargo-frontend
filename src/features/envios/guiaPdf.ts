// Dibujo de la guía imprimible en PDF (A4 vertical): cuatro guías por hoja, cada una solo con el talón
// que firman el remitente y quien recibe, a lo ancho de la hoja. Una guía sola va en la posición elegida
// (1 a 4) para reutilizar la hoja.
// jsPDF y qrcode se cargan con import() dinámico: solo se descargan al imprimir una guía.
// Los textos vienen ya formateados de `datosGuia` (lógica pura y testeada).
import type { jsPDF as JsPdf } from 'jspdf'
import type { Envio } from '@/types/api'
import { AVISOS_GUIA, datosGuia, EMPRESA_GUIA, TALON_GUIA, type DatosGuia, type ParteGuia } from './guiaImprimible'

export type Rgb = [number, number, number]
// Azul marino sobre blanco, como la guía de imprenta; se imprime bien en blanco y negro.
export const AZUL: Rgb = [27, 42, 89]
const ROJO: Rgb = [200, 16, 46]
export const TINTA: Rgb = [25, 25, 25]
export const GRIS: Rgb = [110, 110, 110]
export const BLANCO: Rgb = [255, 255, 255]
const AZUL_MARCA: Rgb = [0, 126, 193]
// Verde del logo (--brand-green) con su texto oscuro (--brand-green-foreground): el blanco sobre verde no se lee.
const VERDE_MARCA: Rgb = [161, 199, 52]
const TEXTO_SOBRE_VERDE: Rgb = [38, 52, 12]

const ANCHO = 210
const ALTO = 297
const M = 6 // margen lateral
export const FIN = ANCHO - M
export const GUIAS_POR_HOJA = 4
/** Alto de cada guía (un talón a lo ancho de la hoja). */
export const ALTO_GUIA = 68
/** Margen hacia el borde de la hoja (zona que la impresora no alcanza). */
const MARGEN_BORDE = 5
/** Separación entre guías, con su línea de corte en el medio (5 mm). */
const SEPARACION = (ALTO - 2 * MARGEN_BORDE - GUIAS_POR_HOJA * ALTO_GUIA) / (GUIAS_POR_HOJA - 1)
export const X_TALON = M
export const ANCHO_TALON = FIN - X_TALON

/** Posición de la guía en la hoja, de arriba (0) a abajo (3). */
export type PosicionHoja = 0 | 1 | 2 | 3
export const POSICIONES_HOJA: PosicionHoja[] = [0, 1, 2, 3]

/** Coordenada Y donde empieza la guía en la posición indicada. */
export function posicionGuia(posicion: PosicionHoja): number {
  return MARGEN_BORDE + posicion * (ALTO_GUIA + SEPARACION)
}

/** Isotipo (sin el texto): en la guía «PCargo» va escrito a su derecha. */
export const RUTA_LOGO = '/brand/pcargo-isotipo.svg'

export interface Logo {
  data: string
  ancho: number
  alto: number
}

/** Rasteriza el isotipo SVG a PNG (jsPDF no dibuja SVG). Sin logo, la guía muestra solo el nombre. */
export async function cargarLogo(): Promise<Logo | null> {
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
export function ajustar(doc: JsPdf, texto: string, max: number): string {
  if (doc.getTextWidth(texto) <= max) return texto
  let t = texto
  while (t.length > 1 && doc.getTextWidth(`${t}...`) > max) t = t.slice(0, -1)
  return `${t.trimEnd()}...`
}

/** Parte el texto en líneas de `max` mm; si pasan de `lineas`, la última se recorta con «...». */
export function lineasHasta(doc: JsPdf, texto: string, max: number, lineas: number): string[] {
  const todas = doc.splitTextToSize(texto, max) as string[]
  if (todas.length <= lineas) return todas
  return [...todas.slice(0, lineas - 1), ajustar(doc, `${todas[lineas - 1]}...`, max)]
}

export function fuente(doc: JsPdf, tamano: number, estilo: 'normal' | 'bold' | 'italic' = 'normal', color: Rgb = TINTA) {
  doc.setFont('helvetica', estilo)
  doc.setFontSize(tamano)
  doc.setTextColor(...color)
}

/** Baja el tamaño de la fuente (hasta `minimo`) para que el texto quepa entero en `max` mm. */
export function fuenteQueQuepa(doc: JsPdf, texto: string, max: number, tamano: number, minimo: number) {
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

export function caja(doc: JsPdf, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.25)
  doc.rect(x, y, w, h, 'S')
}

export function etiqueta(doc: JsPdf, texto: string, x: number, y: number, tamano = 5) {
  fuente(doc, tamano, 'bold', AZUL)
  doc.text(texto, x, y)
}

export function lineaEscritura(doc: JsPdf, x1: number, x2: number, y: number) {
  doc.setDrawColor(...GRIS)
  doc.setLineWidth(0.15)
  doc.line(x1, y, x2, y)
}

export function separadorVertical(doc: JsPdf, x: number, y1: number, y2: number) {
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.2)
  doc.line(x, y1, x, y2)
}

/** Rótulo + valor sobre una línea de escritura (el valor se recorta si no cabe). */
export function campo(doc: JsPdf, rotulo: string, valor: string, x: number, xFin: number, y: number, inicioValor: number) {
  etiqueta(doc, rotulo, x, y, 5.6)
  lineaEscritura(doc, x + inicioValor - 1, xFin, y + 0.7)
  if (valor) {
    fuente(doc, 7.5)
    doc.text(ajustar(doc, valor, xFin - x - inicioValor), x + inicioValor, y)
  }
}

export function bloqueParte(doc: JsPdf, titulo: string, parte: ParteGuia, x: number, y: number, w: number, h: number) {
  caja(doc, x, y, w, h)
  doc.setFillColor(...AZUL)
  doc.rect(x, y, w, 3.4, 'F')
  fuente(doc, 6.3, 'bold', BLANCO)
  doc.text(titulo, x + 1.5, y + 2.5)
  const fin = x + w - 1.5
  campo(doc, 'Nombre:', parte.nombre, x + 1.5, fin, y + 6.6, 11.5)
  campo(doc, 'Dirección:', parte.direccion, x + 1.5, fin, y + 10, 11.5)
  const medio = x + w * 0.5
  campo(doc, 'Ciudad:', parte.ciudad, x + 1.5, medio - 1.5, y + 13.4, 9.5)
  campo(doc, 'Teléfono:', parte.telefono, medio, fin, y + 13.4, 10.5)
}

export function casilla(doc: JsPdf, x: number, y: number, texto: string, marcada: boolean) {
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(0.25)
  doc.rect(x, y, 2.1, 2.1, 'S')
  if (marcada) {
    doc.setDrawColor(...TINTA)
    doc.setLineWidth(0.45)
    doc.line(x + 0.35, y + 0.35, x + 1.75, y + 1.75)
    doc.line(x + 1.75, y + 0.35, x + 0.35, y + 1.75)
  }
  fuente(doc, 4.6, marcada ? 'bold' : 'normal', marcada ? TINTA : AZUL)
  doc.text(texto, x + 2.7, y + 1.7)
}

/** REGISTRO | FECHA | HORA | OPERADOR con valores (o en blanco para llenar a mano). */
export function filaGestion(
  doc: JsPdf,
  titulo: string,
  valores: { fecha: string; hora: string; operador: string },
  x: number,
  y: number,
  w: number,
  h: number,
) {
  caja(doc, x, y, w, h)
  etiqueta(doc, titulo, x + 1, y + h / 2 + 0.7, 4.4)
  const anchos = [17, 10, w - 39]
  const rotulos = ['FECHA', 'HORA', 'OPERADOR']
  const datos = [valores.fecha, valores.hora, valores.operador]
  let cx = x + 12
  anchos.forEach((cw, i) => {
    separadorVertical(doc, cx, y, y + h)
    etiqueta(doc, rotulos[i]!, cx + 0.8, y + 2.1, 4)
    if (datos[i]) {
      fuente(doc, 5.6)
      doc.text(ajustar(doc, datos[i]!, cw - 1.6), cx + 0.8, y + h - 1.2)
    }
    cx += cw
  })
}

/** Alto de la banda y de la cabecera (logo, empresa, número y QR) del talón. */
export const ALTO_ENCABEZADO = 3.6 + 10

/**
 * Banda (rótulo · `ruta` · número) y cabecera (logo · datos de la empresa · número y QR) del talón.
 * La comparten la guía de un envío y la guía en blanco de un talonario (contrato v20).
 */
export function dibujarEncabezado(
  doc: JsPdf,
  d: Pick<DatosGuia, 'numero' | 'ruta' | 'urlSeguimiento'>,
  logo: Logo | null,
  qr: string,
  T: number,
  { rutaEspaciada = true }: { rutaEspaciada?: boolean } = {},
) {
  const x0 = X_TALON
  const w = ANCHO_TALON
  const fin = FIN

  // Banda: rótulo · ruta · número
  doc.setFillColor(...AZUL)
  doc.rect(x0, T, w, 3.6, 'F')
  fuente(doc, 6, 'bold', BLANCO)
  doc.text(TALON_GUIA.titulo, x0 + 1.5, T + 2.6)
  const anchoTitulo = doc.getTextWidth(TALON_GUIA.titulo)
  fuente(doc, 5.2, 'normal', BLANCO)
  doc.text(` (${TALON_GUIA.detalle})`, x0 + 1.5 + anchoTitulo, T + 2.6)
  if (rutaEspaciada) {
    fuente(doc, 6.3, 'bold', BLANCO)
    textoEspaciado(doc, d.ruta, x0 + w / 2 + 4, T + 2.7, 0.5)
  } else if (d.ruta) {
    fuente(doc, 5.2, 'normal', BLANCO)
    doc.text(ajustar(doc, d.ruta, 80), x0 + w / 2 + 4, T + 2.6, { align: 'center' })
  }
  fuente(doc, 6, 'bold', BLANCO)
  doc.text(`GUÍA N.º ${d.numero}`, fin - 1.5, T + 2.6, { align: 'right' })

  // Cabecera: logo · datos de la empresa · número y QR
  const cy = T + 3.6
  const ch = 10
  caja(doc, x0, cy, w, ch)
  let xNombre = x0 + 1.5
  if (logo) {
    doc.addImage(logo.data, 'PNG', x0 + 1, cy + 1, 8, 8)
    xNombre = x0 + 1 + 8 + 1
  }
  fuente(doc, 12, 'bold', AZUL_MARCA)
  doc.text('PCargo', xNombre, cy + 6.6)
  const inicioCentro = xNombre + doc.getTextWidth('PCargo') + 2
  const gx = fin - 28
  const cxCentro = (inicioCentro + gx) / 2
  const anchoCentro = gx - inicioCentro - 1.5
  fuente(doc, 6.3, 'bold', AZUL)
  doc.text(ajustar(doc, EMPRESA_GUIA.servicio, anchoCentro), cxCentro, cy + 2.8, { align: 'center' })
  fuente(doc, 4.8, 'normal', TINTA)
  doc.text(ajustar(doc, `${EMPRESA_GUIA.direccion} · ${EMPRESA_GUIA.ciudad}`, anchoCentro), cxCentro, cy + 5, { align: 'center' })
  doc.text(EMPRESA_GUIA.telefonos, cxCentro, cy + 7, { align: 'center' })
  fuente(doc, 4.3, 'normal', GRIS)
  doc.text(ajustar(doc, `Seguimiento: ${d.urlSeguimiento}`, anchoCentro), cxCentro, cy + 9.1, { align: 'center' })

  separadorVertical(doc, gx, cy, cy + ch)
  const lado = 8.5
  const qx = fin - lado - 0.75
  doc.addImage(qr, 'PNG', qx, cy + (ch - lado) / 2, lado, lado)
  const centroNumero = (gx + qx) / 2
  fuente(doc, 5.3, 'bold', AZUL)
  textoEspaciado(doc, 'GUÍA', centroNumero, cy + 3.3, 0.6)
  fuente(doc, 10, 'bold', ROJO)
  fuenteQueQuepa(doc, d.numero, qx - gx - 1.5, 10, 7)
  doc.text(d.numero, centroNumero, cy + 7.9, { align: 'center' })
}

/** Avisos de la guía en una sola línea, centrados en el ancho del talón. */
export function dibujarAvisos(doc: JsPdf, y: number) {
  const avisos = AVISOS_GUIA.join(' · ')
  fuente(doc, 5, 'bold', AZUL)
  fuenteQueQuepa(doc, avisos, ANCHO_TALON, 5, 3.4)
  doc.text(avisos, X_TALON + ANCHO_TALON / 2, y, { align: 'center' })
}

/** Talón: la guía completa con las firmas del remitente y de quien recibe. */
function dibujarTalon(doc: JsPdf, d: DatosGuia, logo: Logo | null, qr: string, T: number) {
  const x0 = X_TALON
  const w = ANCHO_TALON
  const fin = FIN
  dibujarEncabezado(doc, d, logo, qr, T)

  // Remitente | Destinatario
  const py = T + ALTO_ENCABEZADO + 0.5
  const pw = (w - 2) / 2
  bloqueParte(doc, 'REMITENTE', d.remitente, x0, py, pw, 14.5)
  bloqueParte(doc, 'DESTINATARIO', d.destinatario, x0 + pw + 2, py, pw, 14.5)

  // Avisos en una sola línea
  dibujarAvisos(doc, py + 14.5 + 2.1)

  // Columna izquierda: piezas, peso y descripción, observaciones, aceptación del remitente
  const iy = py + 14.5 + 3
  const iw = 120
  const columnas: [string, string, number][] = [
    ['PIEZAS', d.piezas.total, 16],
    ['SOBRE(S)', d.piezas.sobres, 14],
    ['VALIJA(S)', d.piezas.valijas, 14],
    ['PAQUETE(S)', d.piezas.paquetes, 16],
    ['CARTÓN(ES)', d.piezas.cartones, 16],
    ['OTROS', d.piezas.otros, iw - 76],
  ]
  let x = x0
  for (const [rotulo, valor, cw] of columnas) {
    caja(doc, x, iy, cw, 8)
    etiqueta(doc, rotulo, x + 1, iy + 2.3, 4.2)
    if (valor && rotulo === 'OTROS') {
      // Los tipos sin columna propia pueden ser varios: hasta dos líneas antes de recortar.
      fuente(doc, 4.8, 'bold')
      doc.text(lineasHasta(doc, valor, cw - 2, 2), x + 1, iy + 4.7, { lineHeightFactor: 1.15 })
    } else if (valor) {
      fuente(doc, 8.5, 'bold')
      doc.text(valor, x + cw / 2, iy + 6.6, { align: 'center' })
    }
    x += cw
  }

  const dy = iy + 8
  caja(doc, x0, dy, 16, 6.5)
  etiqueta(doc, 'PESO', x0 + 1, dy + 2.2, 4.4)
  fuente(doc, 7, 'bold')
  doc.text(ajustar(doc, d.peso, 14), x0 + 8, dy + 5.5, { align: 'center' })
  caja(doc, x0 + 16, dy, iw - 16, 6.5)
  etiqueta(doc, 'DESCRIPCIÓN REAL DEL CONTENIDO', x0 + 17, dy + 2.2, 4.4)
  if (d.descripcion) {
    fuente(doc, 6.3)
    doc.text(ajustar(doc, d.descripcion, iw - 18.5), x0 + 17, dy + 5.4)
  }

  const oy = dy + 6.5
  caja(doc, x0, oy, iw, 6)
  etiqueta(doc, 'OBSERVACIONES', x0 + 1, oy + 2.2, 4.4)
  if (d.zona) {
    const xZona = x0 + 1 + doc.getTextWidth('OBSERVACIONES') + 3
    fuente(doc, 4.6, 'bold')
    doc.text(d.zona, xZona, oy + 2.2)
  }
  if (d.referenciaExterna) {
    // Envíos por API: el número de pedido de la empresa, para que lo reconozcan al recibir.
    const rotulo = 'REF. PEDIDO:'
    const xr = x0 + iw - 40
    etiqueta(doc, rotulo, xr, oy + 2.2, 4.4)
    const xValor = xr + doc.getTextWidth(rotulo) + 1
    fuente(doc, 5.8, 'bold')
    doc.text(ajustar(doc, d.referenciaExterna, x0 + iw - 1.2 - xValor), xValor, oy + 2.2)
  }
  if (d.guiaFisica) {
    // Contrato v21: el número de la guía de papel antigua, para cruzarla con el número del sistema.
    const rotulo = 'GUÍA FÍSICA:'
    const xg = d.referenciaExterna ? x0 + iw - 80 : x0 + iw - 40
    etiqueta(doc, rotulo, xg, oy + 2.2, 4.4)
    fuente(doc, 5.8, 'bold')
    doc.text(d.guiaFisica, xg + doc.getTextWidth(rotulo) + 1, oy + 2.2)
  }
  lineaEscritura(doc, x0 + 1.2, x0 + iw - 1.2, oy + 5)

  const ry = oy + 6
  const rh = ALTO_GUIA - (ry - T)
  caja(doc, x0, ry, iw, rh)
  fuente(doc, 4.6, 'normal', TINTA)
  doc.text(lineasHasta(doc, d.aceptacion, iw - 2.4, 2), x0 + 1.2, ry + 2.3, { lineHeightFactor: 1.15 })
  fuente(doc, 4.4, 'italic', GRIS)
  doc.text(lineasHasta(doc, d.seguro, 46, 2), x0 + 1.2, ry + rh - 3.6, { lineHeightFactor: 1.15 })
  lineaEscritura(doc, x0 + 50, x0 + iw - 2, ry + rh - 3.4)
  fuente(doc, 4.4, 'bold', AZUL)
  doc.text('ACEPTO CONDICIONES (REMITENTE)', (x0 + 50 + x0 + iw - 2) / 2, ry + rh - 1.2, { align: 'center' })

  // Columna derecha: uso interno y valor, registro, entrega, recibí conforme
  const dx = x0 + iw
  const dw = fin - dx
  const uw = 30
  const vx = dx + uw
  const vw = fin - vx
  // AL COBRO: la casilla del valor va en verde (el repartidor cobra al entregar).
  const tinta = d.cobrarAlEntregar ? TEXTO_SOBRE_VERDE : TINTA
  const rotulos = d.cobrarAlEntregar ? TEXTO_SOBRE_VERDE : AZUL
  if (d.cobrarAlEntregar) {
    doc.setFillColor(...VERDE_MARCA)
    doc.rect(vx, iy, vw, 8, 'F')
  }
  caja(doc, dx, iy, dw, 8)
  separadorVertical(doc, vx, iy, iy + 8)
  etiqueta(doc, 'USO INTERNO', dx + 1, iy + 2.3, 4.2)
  d.pago.forEach((p, i) => {
    casilla(doc, dx + 1 + (i % 2) * 14, iy + 3.1 + Math.floor(i / 2) * 2.5, p.etiqueta, p.marcada)
  })
  fuente(doc, 4.2, 'bold', rotulos)
  doc.text(d.cobrarAlEntregar ? 'COBRAR AL ENTREGAR (USD)' : 'VALOR USD', vx + 1, iy + 2.3)
  if (d.adicional) {
    // Contrato v15: el costo adicional en una línea antes del total (que ya lo incluye), en la misma casilla.
    fuente(doc, 4.8, 'bold', tinta)
    const anchoAdicional = doc.getTextWidth(d.adicional)
    doc.text(d.adicional, fin - 1, iy + 4.6, { align: 'right' })
    fuente(doc, 3.8, 'bold', rotulos)
    doc.text(ajustar(doc, 'ADICIONAL', vw - 3 - anchoAdicional), vx + 1, iy + 4.6)
    fuente(doc, 7.5, 'bold', tinta)
    doc.text(ajustar(doc, d.valor, vw - 2), fin - 1, iy + 7.3, { align: 'right' })
  } else {
    fuente(doc, 9, 'bold', tinta)
    doc.text(ajustar(doc, d.valor, vw - 2), fin - 1, iy + 6.9, { align: 'right' })
  }

  filaGestion(doc, 'REGISTRO', d.registro, dx, iy + 8, dw, 6.5)
  filaGestion(doc, 'ENTREGA', d.entrega, dx, iy + 14.5, dw, 6.5)

  const ey = iy + 21
  const eh = ALTO_GUIA - (ey - T)
  caja(doc, dx, ey, dw, eh)
  etiqueta(doc, 'RECIBÍ CONFORME', dx + 1, ey + 2.4, 5.2)
  campo(doc, 'NOMBRE:', d.entrega.recibidoPor, dx + 1, fin - 1.2, ey + 5.9, 10.5)
  doc.setDrawColor(...TINTA)
  doc.setLineWidth(0.25)
  doc.line(dx + 4, ey + eh - 2.6, fin - 4, ey + eh - 2.6)
  fuente(doc, 4.4, 'bold', AZUL)
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
  doc.circle(x, y - 1, 0.6, 'S')
  doc.circle(x, y + 1, 0.6, 'S')
  doc.line(x + 0.5, y - 0.6, x + 4.5, y + 0.9)
  doc.line(x + 0.5, y + 0.6, x + 4.5, y - 0.9)
}

/** QR (PNG en data URL) con el enlace de seguimiento de la guía. */
export async function qrDeGuia(url: string): Promise<string> {
  const qrMod = await import('qrcode')
  const QR = qrMod.default ?? qrMod
  return QR.toDataURL(url, { errorCorrectionLevel: 'M', margin: 0, width: 300, color: { dark: '#1b2a59', light: '#ffffff' } })
}

export async function cargarRecursos() {
  const [{ jsPDF }, logo] = await Promise.all([import('jspdf'), cargarLogo()])
  return { jsPDF, qrDe: qrDeGuia, logo }
}

/** Orden de impresión de varias guías: por número, de menor a mayor. */
export function ordenarParaImprimir<T extends Pick<Envio, 'numeroGuia'>>(envios: T[]): T[] {
  return [...envios].sort((a, b) => a.numeroGuia - b.numeroGuia)
}

/** Hoja (desde 0) y posición donde va la guía `i` al imprimir varias: cuatro guías por hoja. */
export function ubicacionGuia(i: number): { hoja: number; posicion: PosicionHoja } {
  return { hoja: Math.floor(i / GUIAS_POR_HOJA), posicion: (i % GUIAS_POR_HOJA) as PosicionHoja }
}

/** «guias-0040461-0040470.pdf» para varias guías (ya ordenadas). */
export function nombreArchivoGuias(datos: Pick<DatosGuia, 'numero' | 'nombreArchivo'>[]): string {
  if (datos.length === 1) return datos[0]!.nombreArchivo
  return `guias-${datos[0]!.numero}-${datos[datos.length - 1]!.numero}.pdf`
}

/**
 * Genera el PDF de una o varias guías. Una guía sola va en la posición elegida; varias se organizan
 * cuatro talones por hoja.
 */
export async function crearGuiasPdf(
  envios: Envio[],
  { origen, posicion = 0 }: { origen?: string; posicion?: PosicionHoja } = {},
): Promise<{ blob: Blob; nombreArchivo: string }> {
  if (envios.length === 0) throw new Error('No hay guías para imprimir')
  const datos = ordenarParaImprimir(envios).map((e) => datosGuia(e, origen))
  const { jsPDF, qrDe, logo } = await cargarRecursos()
  const qrs = await Promise.all(datos.map((d) => qrDe(d.urlSeguimiento)))

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  datos.forEach((d, i) => {
    const { hoja, posicion: p } = datos.length === 1 ? { hoja: 0, posicion } : ubicacionGuia(i)
    if (hoja > 0 && p === 0) doc.addPage('a4', 'portrait')
    componerGuia(doc, d, logo, qrs[i]!, p)
  })
  if (datos.length > 1) {
    doc.setProperties({ title: `Guías ${datos[0]!.numero} a ${datos[datos.length - 1]!.numero} - PCargo` })
  }
  return { blob: doc.output('blob'), nombreArchivo: nombreArchivoGuias(datos) }
}

/** Genera el PDF de una guía (un cuarto de hoja A4). */
export function crearGuiaPdf(envio: Envio, origen?: string, posicion: PosicionHoja = 0) {
  return crearGuiasPdf([envio], { origen, posicion })
}

/**
 * Dibuja el talón de la guía en la posición indicada de un A4 ya creado, con las líneas de corte hacia
 * las guías vecinas. El resto de la hoja queda en blanco.
 */
export function componerGuia(doc: JsPdf, d: DatosGuia, logo: Logo | null, qr: string, posicion: PosicionHoja = 0): void {
  doc.setProperties({ title: `Guía ${d.numero} - PCargo`, subject: 'Guía de encomienda', creator: 'PCargo' })
  const T = posicionGuia(posicion)
  dibujarTalon(doc, d, logo, qr, T)
  lineasDeCorte(doc, posicion)
}

/** Líneas de corte hacia las guías vecinas de la posición indicada. */
export function lineasDeCorte(doc: JsPdf, posicion: PosicionHoja): void {
  const T = posicionGuia(posicion)
  if (posicion > 0) lineaCorte(doc, T - SEPARACION / 2)
  if (posicion < GUIAS_POR_HOJA - 1) lineaCorte(doc, T + ALTO_GUIA + SEPARACION / 2)
}

const CLAVE_POSICION = 'pcargo.guia.posicion'

/** Posición de la hoja elegida la última vez (por defecto, la primera de arriba). */
export function leerPosicionGuia(): PosicionHoja {
  try {
    const n = Number(localStorage.getItem(CLAVE_POSICION))
    return (POSICIONES_HOJA as number[]).includes(n) ? (n as PosicionHoja) : 0
  } catch {
    return 0
  }
}

export function guardarPosicionGuia(posicion: PosicionHoja): void {
  try {
    localStorage.setItem(CLAVE_POSICION, String(posicion))
  } catch {
    // Sin almacenamiento: se usa la primera posición.
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

/** Imprime o descarga la guía en la posición elegida (por defecto, la última que se usó). */
export async function generarGuia(envio: Envio, accion: AccionGuia, posicion: PosicionHoja = leerPosicionGuia()): Promise<void> {
  const pdf = await crearGuiaPdf(envio, undefined, posicion)
  if (accion === 'imprimir') imprimirPdf(pdf)
  else descargarPdf(pdf)
}

/** Imprime o descarga varias guías organizadas cuatro por hoja. */
export async function generarGuias(envios: Envio[], accion: AccionGuia): Promise<void> {
  const pdf = await crearGuiasPdf(envios)
  if (accion === 'imprimir') imprimirPdf(pdf)
  else descargarPdf(pdf)
}
