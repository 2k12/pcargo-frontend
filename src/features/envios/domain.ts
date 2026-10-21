import { formatCurrency } from '@/lib/format'
import type { Cotizacion, Estado, FormaPago, ItemSolicitud, TipoCarga, TipoCargaCodigo, TipoCargaPublico, Zona } from '@/types/api'

export const ESTADOS: Estado[] = [
  'REGISTRADO',
  'EN_TRANSITO',
  'EN_REPARTO',
  'ENTREGADO',
  'NO_ENTREGADO',
  'NOVEDAD',
  'CANCELADO',
]

/** Flujo principal (camino feliz) para el stepper de seguimiento. */
export const FLUJO_ESTADOS: Estado[] = ['REGISTRADO', 'EN_TRANSITO', 'EN_REPARTO', 'ENTREGADO']

export const ESTADO_LABEL: Record<Estado, string> = {
  REGISTRADO: 'Registrado',
  EN_TRANSITO: 'En tránsito',
  EN_REPARTO: 'En reparto',
  ENTREGADO: 'Entregado',
  NO_ENTREGADO: 'No entregado',
  NOVEDAD: 'Novedad',
  CANCELADO: 'Cancelado',
}

/** Etiqueta de la acción que lleva al estado destino. */
export const ACCION_LABEL: Record<Estado, string> = {
  REGISTRADO: 'Registrar',
  EN_TRANSITO: 'Despachar',
  EN_REPARTO: 'Enviar a reparto',
  ENTREGADO: 'Marcar entregado',
  NO_ENTREGADO: 'No entregado',
  NOVEDAD: 'Registrar novedad',
  CANCELADO: 'Cancelar envío',
}

/** Etiqueta de la acción considerando el estado de origen (p. ej. reintento tras NO_ENTREGADO). */
export function accionLabel(desde: Estado, hacia: Estado): string {
  if (hacia === 'EN_REPARTO' && desde === 'NO_ENTREGADO') return 'Reintentar entrega'
  if (hacia === 'EN_REPARTO' && desde === 'NOVEDAD') return 'Retomar reparto'
  return ACCION_LABEL[hacia]
}

const TRANSICIONES: Record<Estado, Estado[]> = {
  REGISTRADO: ['EN_TRANSITO', 'CANCELADO'],
  EN_TRANSITO: ['EN_REPARTO', 'NOVEDAD'],
  EN_REPARTO: ['ENTREGADO', 'NO_ENTREGADO', 'NOVEDAD'],
  NOVEDAD: ['EN_REPARTO', 'ENTREGADO', 'NO_ENTREGADO'],
  NO_ENTREGADO: ['EN_REPARTO'],
  ENTREGADO: [],
  CANCELADO: [],
}

export function transicionesPermitidas(estado: Estado): Estado[] {
  return TRANSICIONES[estado] ?? []
}

export function puedeTransicionar(desde: Estado, hacia: Estado): boolean {
  return transicionesPermitidas(desde).includes(hacia)
}

/**
 * Cambios de estado que se aplican de una vez a varios envíos marcados. Entregado, no entregado y novedad
 * quedan fuera: piden evidencia o un motivo por cada envío.
 */
export const ESTADOS_CAMBIO_RAPIDO: Estado[] = ['EN_TRANSITO', 'EN_REPARTO', 'CANCELADO']

/** Envíos de la selección que pueden pasar a `destino`. */
export function aplicablesPara<T extends { estado: Estado }>(envios: T[], destino: Estado): T[] {
  return envios.filter((e) => puedeTransicionar(e.estado, destino))
}

export function esEstadoFinal(estado: Estado): boolean {
  return transicionesPermitidas(estado).length === 0
}

/** NO_ENTREGADO y NOVEDAD exigen registrar el motivo. */
export function requiereNota(estado: Estado): boolean {
  return estado === 'NO_ENTREGADO' || estado === 'NOVEDAD'
}

export const FORMAS_PAGO: FormaPago[] = ['PAGADO', 'AL_COBRO', 'CONTRATO', 'SEGURO']

export const FORMA_PAGO_LABEL: Record<FormaPago, string> = {
  PAGADO: 'Pagado',
  AL_COBRO: 'Al cobro',
  CONTRATO: 'Contrato',
  SEGURO: 'Seguro',
}

export const FORMA_PAGO_DESCRIPCION: Record<FormaPago, string> = {
  PAGADO: 'Pagado al enviar',
  AL_COBRO: 'Paga el destinatario',
  CONTRATO: 'Cliente con contrato',
  SEGURO: 'Cubierto por seguro',
}

const semilla = (
  orden: number,
  codigo: string,
  nombre: string,
  precio: number,
  pesoMaxKg: number,
  extra: Partial<TipoCarga> = {},
): TipoCarga => ({
  codigo,
  nombre,
  precio,
  precioRural: null,
  mayoreo: null,
  pesoMaxKg,
  activo: true,
  orden,
  actualizadoEn: null,
  actualizadoPor: null,
  ...extra,
})

/**
 * Semilla del catálogo (contrato v8/v11). Solo es un respaldo mientras carga `/tipos-carga` o si falla:
 * en cuanto el catálogo del backend llega, manda él (tipos nuevos, inactivos, nombres y precios).
 */
export const TIPOS_CARGA_DEFAULT: TipoCarga[] = [
  semilla(1, 'SOBRE', 'Sobre', 3, 0.5),
  semilla(2, 'PAQUETE', 'Paquete', 3, 50),
  semilla(3, 'CARTON', 'Cartón', 3, 35),
  semilla(4, 'VALIJA', 'Valija', 3, 25),
  semilla(5, 'TELA', 'Rollo de tela', 1.25, 50, { precioRural: 1.5, mayoreo: { minimoExclusivo: 50, precio: 1 } }),
  semilla(6, 'PLUMON_PEQUENO', 'Plumón pequeño', 3, 50),
  semilla(7, 'PLUMON_GRANDE', 'Plumón grande', 4, 50),
]

/**
 * Nombres conocidos de los tipos de carga: los del último catálogo recibido del backend (se registran al
 * cargarlo) y, como respaldo, los de la semilla. Permite nombrar los ítems de envíos, seguimiento o guías
 * sin pasar el catálogo por toda la interfaz.
 */
const nombresRegistrados = new Map<string, string>()

export function registrarTiposCarga(tipos: Pick<TipoCarga, 'codigo' | 'nombre'>[]): void {
  for (const t of tipos) nombresRegistrados.set(t.codigo, t.nombre)
}

/** «CAJA_GRANDE» → «Caja grande»: nombre legible para un código que aún no está en el catálogo cargado. */
export function humanizarCodigo(codigo: string): string {
  const texto = codigo.replace(/_+/g, ' ').trim().toLowerCase()
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Nombre de un tipo: el del catálogo dado, el último registrado, el de la semilla o el código legible. */
export function nombreTipoCarga(codigo: TipoCargaCodigo, tipos?: Pick<TipoCarga, 'codigo' | 'nombre'>[]): string {
  return (
    tipos?.find((t) => t.codigo === codigo)?.nombre ??
    nombresRegistrados.get(codigo) ??
    TIPOS_CARGA_DEFAULT.find((t) => t.codigo === codigo)?.nombre ??
    humanizarCodigo(codigo)
  )
}

/** Palabras tras las que el resto del nombre no se pluraliza («rollos de tela», «cajas para vino»). */
const NEXOS = new Set(['de', 'del', 'para', 'con', 'sin', 'en', 'a', 'al', 'por', 'y', 'o'])
const SIN_TILDE: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' }

function pluralPalabra(p: string): string {
  if (!p || /\d/.test(p) || (p.length > 1 && p === p.toUpperCase())) return p // siglas y medidas: «XL», «20kg»
  if (/[sx]$/i.test(p)) return p
  if (/[aeiouáéó]$/i.test(p)) return `${p}s`
  if (/z$/i.test(p)) return `${p.slice(0, -1)}ces`
  // Aguda terminada en n o s con tilde: «cartón» → «cartones», «plumón» → «plumones».
  const aguda = /([áéíóú])n$/i.exec(p)
  if (aguda) return `${p.slice(0, -2)}${SIN_TILDE[aguda[1]!.toLowerCase()] ?? aguda[1]}nes`
  return `${p}es`
}

/** Plural en español de un nombre: «Plumón pequeño» → «Plumones pequeños», «Rollo de tela» → «Rollos de tela». */
export function pluralizar(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/)
  let enNexo = false
  return palabras
    .map((p) => {
      if (enNexo) return p
      if (NEXOS.has(p.toLowerCase())) {
        enNexo = true
        return p
      }
      return pluralPalabra(p)
    })
    .join(' ')
}

/** Minúsculas para usar el nombre dentro de una frase, sin tocar las siglas («Caja XL» → «caja XL»). */
export function enFrase(nombre: string): string {
  return nombre
    .split(/(\s+)/)
    .map((p) => (p.length > 1 && p === p.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(p) ? p : p.toLowerCase()))
    .join('')
}

export const ZONAS: Zona[] = ['URBANA', 'RURAL']

export const ZONA_LABEL: Record<Zona, string> = {
  URBANA: 'Urbana',
  RURAL: 'Rural',
}

/** El tipo cambia de precio según la zona de entrega (los que tienen un precio rural distinto). */
export function dependeDeZona(tipo: Pick<TipoCarga, 'precioRural' | 'precio'>): boolean {
  return tipo.precioRural !== null && tipo.precioRural !== tipo.precio
}

/** ¿Alguna línea del envío tiene precio distinto según la zona? */
export function zonaInfluye(items: Pick<ItemSolicitud, 'tipoCarga'>[], tipos: TipoCargaPublico[]): boolean {
  return items.some((i) => {
    const t = tipos.find((x) => x.codigo === i.tipoCarga)
    return t ? dependeDeZona(t) : false
  })
}

/**
 * Precio por unidad de un tipo (contrato v8, «Precio por línea»): con mayoreo y más de `minimoExclusivo`
 * unidades del tipo en todo el envío, todas valen el precio por volumen; si no, rural/urbano.
 */
export function precioUnitario(tipo: TipoCargaPublico, zona: Zona, unidadesDelTipo: number): { precio: number; mayoreo: boolean } {
  if (tipo.mayoreo && unidadesDelTipo > tipo.mayoreo.minimoExclusivo) return { precio: tipo.mayoreo.precio, mayoreo: true }
  return { precio: zona === 'RURAL' && tipo.precioRural !== null ? tipo.precioRural : tipo.precio, mayoreo: false }
}

/** Menor precio base publicado (sin contar el de mayoreo): la cifra «envíos desde». */
export function precioDesde(tipos: TipoCargaPublico[]): number | null {
  return tipos.length ? Math.min(...tipos.map((t) => Math.min(t.precio, t.precioRural ?? t.precio))) : null
}

/** Precio publicado de un tipo: «$3,00» o, si cambia por zona, «$1,25 urbana · $1,50 rural». */
export function precioTipoTexto(tipo: TipoCargaPublico): string {
  if (!dependeDeZona(tipo)) return formatCurrency(tipo.precio)
  return `${formatCurrency(tipo.precio)} urbana · ${formatCurrency(tipo.precioRural!)} rural`
}

/** Regla por volumen: «más de 50 rollos de tela: $1,00 c/u» (null si el tipo no tiene). */
export function mayoreoTexto(tipo: TipoCargaPublico): string | null {
  if (!tipo.mayoreo) return null
  const { minimoExclusivo, precio } = tipo.mayoreo
  return `más de ${minimoExclusivo} ${nombreTipo(tipo.codigo, minimoExclusivo, [tipo])}: ${formatCurrency(precio)} c/u`
}

/** «Más de 50 rollos de tela: $1,00 c/u» por cada tipo al que la cotización aplicó el precio por volumen. */
export function notasMayoreo(cotizacion: Pick<Cotizacion, 'items'>, tipos: TipoCargaPublico[]): string[] {
  const codigos = [...new Set(cotizacion.items.filter((i) => i.mayoreo).map((i) => i.tipoCarga))]
  return codigos.flatMap((codigo) => {
    const tipo = tipos.find((t) => t.codigo === codigo)
    const texto = tipo ? mayoreoTexto(tipo) : null
    return texto ? [texto.charAt(0).toUpperCase() + texto.slice(1)] : []
  })
}

/** Nombre en una frase según la cantidad: «1 cartón», «20 cartones», «2 cajas grandes» (tipos nuevos incluidos). */
export function nombreTipo(tipo: TipoCargaCodigo, cantidad: number, tipos?: Pick<TipoCarga, 'codigo' | 'nombre'>[]): string {
  const nombre = enFrase(nombreTipoCarga(tipo, tipos))
  return cantidad === 1 ? nombre : pluralizar(nombre)
}

/** "5 paquetes · 20 cartones": agrupa por tipo (suma cantidades) respetando el orden de aparición. */
export function resumenItems(
  items: Pick<ItemSolicitud, 'tipoCarga' | 'cantidad'>[],
  tipos?: Pick<TipoCarga, 'codigo' | 'nombre'>[],
): string {
  const porTipo = new Map<TipoCargaCodigo, number>()
  for (const i of items) porTipo.set(i.tipoCarga, (porTipo.get(i.tipoCarga) ?? 0) + i.cantidad)
  return [...porTipo].map(([tipo, n]) => `${n} ${nombreTipo(tipo, n, tipos)}`).join(' · ')
}

export function totalPiezas(items: Pick<ItemSolicitud, 'cantidad'>[]): number {
  return items.reduce((s, i) => s + (Number.isFinite(i.cantidad) ? i.cantidad : 0), 0)
}

export function pesoTotal(items: Pick<ItemSolicitud, 'cantidad' | 'pesoKg'>[]): number {
  const total = items.reduce(
    (s, i) => s + (Number.isFinite(i.cantidad) && Number.isFinite(i.pesoKg) ? i.cantidad * i.pesoKg : 0),
    0,
  )
  return Math.round(total * 100) / 100
}

export function piezasLabel(n: number): string {
  return `${n} ${n === 1 ? 'pieza' : 'piezas'}`
}
