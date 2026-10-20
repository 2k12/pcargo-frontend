// Dibujo de la guía imprimible en PDF (A4 vertical), formato talonario: cuatro guías por hoja.
// Cada guía es una franja con la parte cuadrada que va pegada en el paquete y, a su derecha, el
// talón que firma quien recibe. Una guía sola va en la posición elegida (1 a 4) para reutilizar la hoja.
// jsPDF y qrcode se cargan con import() dinámico: solo se descargan al imprimir una guía.
// Los textos vienen ya formateados de `datosGuia` (lógica pura y testeada).
import type { jsPDF as JsPdf } from 'jspdf'
import type { Envio } from '@/types/api'
import { AVISOS_GUIA, datosGuia, EMPRESA_GUIA, PARTES_GUIA, type DatosGuia, type ParteGuia } from './guiaImprimible'

type Rgb = [number, number, number]
// Azul marino sobre blanco, como la guía de imprenta; se imprime bien en blanco y negro.
const AZUL: Rgb = [27, 42, 89]
const ROJO: Rgb = [200, 16, 46]
const TINTA: Rgb = [25, 25, 25]
const GRIS: Rgb = [110, 110, 110]
const BLANCO: Rgb = [255, 255, 255]
const AZUL_MARCA: Rgb = [0, 126, 193]
// Verde del logo (--brand-green) con su texto oscuro (--brand-green-foreground): el blanco sobre verde no se lee.
const VERDE_MARCA: Rgb = [161, 199, 52]
const TEXTO_SOBRE_VERDE: Rgb = [38, 52, 12]

const ANCHO = 210
const ALTO = 297
const M = 6 // margen lateral
const FIN = ANCHO - M
export const GUIAS_POR_HOJA = 4
/** Alto de cada guía; la parte del paquete es un cuadrado de este lado. */
export const ALTO_GUIA = 68
export const LADO_PAQUETE = ALTO_GUIA
/** Margen hacia el borde de la hoja (zona que la impresora no alcanza). */
const MARGEN_BORDE = 5
/** Separación entre guías, con su línea de corte en el medio (5 mm). */
const SEPARACION = (ALTO - 2 * MARGEN_BORDE - GUIAS_POR_HOJA * ALTO_GUIA) / (GUIAS_POR_HOJA - 1)
/** Separación entre la parte cuadrada y el talón, con el corte vertical en el medio. */
const SEPARACION_TALON = 4
export const X_TALON = M + LADO_PAQUETE + SEPARACION_TALON
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

/** Parte el texto en líneas de `max` mm; si pasan de `lineas`, la última se recorta con «...». */
function lineasHasta(doc: JsPdf, texto: string, max: number, lineas: number): string[] {
  const todas = doc.splitTextToSize(texto, max) as string[]
  if (todas.length <= lineas) return todas
  return [...todas.slice(0, lineas - 1), ajustar(doc, `${todas[lineas - 1]}...`, max)]
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
  const medio = x + w * 0.5
  campo(doc, 'Ciudad:', parte.ciudad, x + 1.5, medio - 1.5, y + 13.4, 9.5)
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
  fuente(doc, 4.6, marcada ? 'bold' : 'normal', marcada ? TINTA : AZUL)
  doc.text(texto, x + 2.7, y + 1.7)
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
  etiqueta(doc, titulo, x + 1, y + h / 2 + 0.7, 4.4)
  const anchos = [14, 8, w - 34]
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

/** Parte cuadrada que va pegada en el paquete: lo necesario para moverlo y entregarlo. */
function dibujarPaquete(doc: JsPdf, d: DatosGuia, logo: Logo | null, qr: string, T: number) {
  const x0 = M
  const L = LADO_PAQUETE
  const fin = x0 + L
  const linea = (y: number) => {
    doc.setDrawColor(...AZUL)
    doc.setLineWidth(0.2)
    doc.line(x0, y, fin, y)
  }

  // Banda: rótulo de la parte · zona rural
  doc.setFillColor(...AZUL)
  doc.rect(x0, T, L, 4, 'F')
  fuente(doc, 5.8, 'bold', BLANCO)
  doc.text(PARTES_GUIA.paquete.titulo, x0 + 1.5, T + 2.8)
  if (d.zona) {
    fuente(doc, 5.3, 'bold', BLANCO)
    doc.text(d.zona, fin - 1.5, T + 2.8, { align: 'right' })
  }
  caja(doc, x0, T, L, L)

  // Logo con «PCargo» · número de guía
  let xNombre = x0 + 1.5
  if (logo) {
    doc.addImage(logo.data, 'PNG', x0 + 1.2, T + 5, 8, 8)
    xNombre = x0 + 1.2 + 8 + 1.2
  }
  fuente(doc, 12, 'bold', AZUL_MARCA)
  doc.text('PCargo', xNombre, T + 11.3)
  fuente(doc, 5.3, 'bold', AZUL)
  doc.text('GUÍA N.º', fin - 1.5, T + 6.8, { align: 'right' })
  fuente(doc, 13, 'bold', ROJO)
  doc.text(d.numero, fin - 1.5, T + 12.4, { align: 'right' })
  linea(T + 14)

  // Ruta (discreta: lo importante para entregar es el destinatario)
  fuente(doc, 7.5, 'bold', AZUL)
  fuenteQueQuepa(doc, d.ruta, L - 3, 7.5, 5.5)
  doc.text(d.ruta, x0 + L / 2, T + 17.3, { align: 'center' })
  linea(T + 18.6)

  // QR · destinatario en letra grande
  const ladoQr = 22
  doc.addImage(qr, 'PNG', x0 + 1.5, T + 20.6, ladoQr, ladoQr)
  const xr = x0 + 1.5 + ladoQr + 2
  const wr = fin - 1.5 - xr
  etiqueta(doc, 'PARA:', xr, T + 21.8, 5.3)
  let y = T + 25.8
  fuente(doc, 10.5, 'bold')
  const nombre = lineasHasta(doc, d.destinatario.nombre, wr, 2)
  doc.text(nombre, xr, y, { lineHeightFactor: 1.05 })
  y += nombre.length * 3.9 + 0.3
  if (d.destinatario.direccion) {
    fuente(doc, 7.2)
    const direccion = lineasHasta(doc, d.destinatario.direccion, wr, nombre.length > 1 ? 2 : 3)
    doc.text(direccion, xr, y, { lineHeightFactor: 1.12 })
    y += direccion.length * 2.85 + 0.5
  }
  fuente(doc, 7.8, 'bold', AZUL)
  doc.text(ajustar(doc, d.destinatario.ciudad.toLocaleUpperCase('es-EC'), wr), xr, y)
  fuente(doc, 9, 'bold')
  doc.text(ajustar(doc, `Telf. ${d.destinatario.telefono}`, wr), xr, y + 3.6)
  linea(T + 46.5)

  // Remitente en una línea
  etiqueta(doc, 'DE:', x0 + 1.5, T + 49.5, 5.3)
  fuente(doc, 7)
  const remitente = [d.remitente.nombre, d.remitente.telefono].filter(Boolean).join(' · ')
  doc.text(ajustar(doc, remitente, L - 8), x0 + 6.5, T + 49.5)

  // Piezas · peso · forma de pago
  const fy = T + 51
  const cw = L / 3
  const celdas: [string, string][] = [
    ['PIEZAS', d.piezas.total || '0'],
    ['PESO', d.peso],
    ['PAGO', d.formaPago],
  ]
  celdas.forEach(([rotulo, valor], i) => {
    const cx = x0 + i * cw
    caja(doc, cx, fy, cw, 7.5)
    etiqueta(doc, rotulo, cx + 1.2, fy + 2.2, 4.4)
    if (valor) {
      fuente(doc, 8, 'bold')
      fuenteQueQuepa(doc, valor, cw - 2, 8, 5)
      doc.text(valor, cx + cw / 2, fy + 6.3, { align: 'center' })
    }
  })

  // Valor: AL COBRO va resaltado (el repartidor cobra al entregar)
  const vy = fy + 7.5
  const vh = T + L - vy
  if (d.cobrarAlEntregar) {
    doc.setFillColor(...VERDE_MARCA)
    doc.rect(x0, vy, L, vh, 'F')
    caja(doc, x0, vy, L, vh)
    fuente(doc, 5.8, 'bold', TEXTO_SOBRE_VERDE)
    doc.text('COBRAR AL ENTREGAR', x0 + 1.5, vy + vh / 2 + 1)
    fuente(doc, 11, 'bold', TEXTO_SOBRE_VERDE)
  } else {
    caja(doc, x0, vy, L, vh)
    etiqueta(doc, 'VALOR USD', x0 + 1.5, vy + vh / 2 + 1, 5.3)
    fuente(doc, 10, 'bold')
  }
  doc.text(ajustar(doc, d.valor, L - 26), fin - 1.5, vy + vh / 2 + 1.6, { align: 'right' })
}

/** Talón: la guía completa con las firmas del remitente y de quien recibe. */
function dibujarTalon(doc: JsPdf, d: DatosGuia, logo: Logo | null, qr: string, T: number) {
  const x0 = X_TALON
  const w = ANCHO_TALON
  const fin = FIN

  // Banda: rótulo · ruta · número
  doc.setFillColor(...AZUL)
  doc.rect(x0, T, w, 3.6, 'F')
  fuente(doc, 6, 'bold', BLANCO)
  doc.text(PARTES_GUIA.talon.titulo, x0 + 1.5, T + 2.6)
  const anchoTitulo = doc.getTextWidth(PARTES_GUIA.talon.titulo)
  fuente(doc, 5.2, 'normal', BLANCO)
  doc.text(` (${PARTES_GUIA.talon.detalle})`, x0 + 1.5 + anchoTitulo, T + 2.6)
  fuente(doc, 6.3, 'bold', BLANCO)
  textoEspaciado(doc, d.ruta, x0 + w / 2 + 4, T + 2.7, 0.5)
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

  // Remitente | Destinatario
  const py = cy + ch + 0.5
  const pw = (w - 2) / 2
  bloqueParte(doc, 'REMITENTE', d.remitente, x0, py, pw, 14.5)
  bloqueParte(doc, 'DESTINATARIO', d.destinatario, x0 + pw + 2, py, pw, 14.5)

  // Avisos en una sola línea
  const avisos = AVISOS_GUIA.join(' · ')
  fuente(doc, 5, 'bold', AZUL)
  fuenteQueQuepa(doc, avisos, w, 5, 3.4)
  doc.text(avisos, x0 + w / 2, py + 14.5 + 2.1, { align: 'center' })

  // Columna izquierda: piezas, peso y descripción, observaciones, aceptación del remitente
  const iy = py + 14.5 + 3
  const iw = 78
  const columnas: [string, string, number][] = [
    ['PIEZAS', d.piezas.total, 13],
    ['SOBRE(S)', d.piezas.sobres, 11],
    ['VALIJA(S)', d.piezas.valijas, 11],
    ['PAQUETE(S)', d.piezas.paquetes, 12.5],
    ['CARTÓN(ES)', d.piezas.cartones, 12.5],
    ['OTROS', d.piezas.otros, iw - 60],
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
  lineaEscritura(doc, x0 + 1.2, x0 + iw - 1.2, oy + 5)

  const ry = oy + 6
  const rh = ALTO_GUIA - (ry - T)
  caja(doc, x0, ry, iw, rh)
  fuente(doc, 4.6, 'normal', TINTA)
  doc.text(lineasHasta(doc, d.aceptacion, iw - 2.4, 2), x0 + 1.2, ry + 2.3, { lineHeightFactor: 1.15 })
  fuente(doc, 4.4, 'italic', GRIS)
  doc.text(lineasHasta(doc, d.seguro, 33, 2), x0 + 1.2, ry + rh - 3.6, { lineHeightFactor: 1.15 })
  lineaEscritura(doc, x0 + 37, x0 + iw - 2, ry + rh - 3.4)
  fuente(doc, 4.4, 'bold', AZUL)
  doc.text('ACEPTO CONDICIONES (REMITENTE)', (x0 + 37 + x0 + iw - 2) / 2, ry + rh - 1.2, { align: 'center' })

  // Columna derecha: uso interno y valor, registro, entrega, recibí conforme
  const dx = x0 + iw
  const dw = fin - dx
  const uw = 26
  caja(doc, dx, iy, dw, 8)
  separadorVertical(doc, dx + uw, iy, iy + 8)
  etiqueta(doc, 'USO INTERNO', dx + 1, iy + 2.3, 4.2)
  d.pago.forEach((p, i) => {
    casilla(doc, dx + 1 + (i % 2) * 12.4, iy + 3.1 + Math.floor(i / 2) * 2.5, p.etiqueta, p.marcada)
  })
  const vx = dx + uw
  const vw = fin - vx
  etiqueta(doc, 'VALOR USD', vx + 1, iy + 2.3, 4.2)
  if (d.adicional) {
    // Contrato v15: el costo adicional en una línea antes del total (que ya lo incluye), en la misma casilla.
    fuente(doc, 4.8, 'bold')
    const anchoAdicional = doc.getTextWidth(d.adicional)
    doc.text(d.adicional, fin - 1, iy + 4.6, { align: 'right' })
    fuente(doc, 3.8, 'bold', AZUL)
    doc.text(ajustar(doc, 'ADICIONAL', vw - 3 - anchoAdicional), vx + 1, iy + 4.6)
    fuente(doc, 7.5, 'bold')
    doc.text(ajustar(doc, d.valor, vw - 2), fin - 1, iy + 7.3, { align: 'right' })
  } else {
    fuente(doc, 9, 'bold')
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

/** Corte vertical punteado entre la parte cuadrada y el talón. */
function corteVertical(doc: JsPdf, T: number) {
  const x = M + LADO_PAQUETE + SEPARACION_TALON / 2
  doc.setDrawColor(...GRIS)
  doc.setLineWidth(0.25)
  doc.setLineDashPattern([1.5, 1.2], 0)
  doc.line(x, T, x, T + ALTO_GUIA)
  doc.setLineDashPattern([], 0)
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
 * cuatro por hoja (cada una con su parte del paquete y su talón).
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
 * Dibuja la guía en la posición indicada de un A4 ya creado: la parte cuadrada del paquete, el corte
 * vertical y el talón, con las líneas de corte hacia las guías vecinas. El resto de la hoja queda en blanco.
 */
export function componerGuia(doc: JsPdf, d: DatosGuia, logo: Logo | null, qr: string, posicion: PosicionHoja = 0): void {
  doc.setProperties({ title: `Guía ${d.numero} - PCargo`, subject: 'Guía de encomienda', creator: 'PCargo' })
  const T = posicionGuia(posicion)
  dibujarPaquete(doc, d, logo, qr, T)
  corteVertical(doc, T)
  dibujarTalon(doc, d, logo, qr, T)
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
