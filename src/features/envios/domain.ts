import { formatCurrency } from '@/lib/format'
import type { Cotizacion, Estado, FormaPago, ItemSolicitud, TipoCarga, TipoCargaCodigo, Zona } from '@/types/api'

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

/** Catálogo por defecto (igual al backend, contrato v8); se usa mientras carga /tipos-carga. */
export const TIPOS_CARGA_DEFAULT: TipoCarga[] = [
  { codigo: 'SOBRE', nombre: 'Sobre', precio: 3, precioRural: null, mayoreo: null, pesoMaxKg: 0.5 },
  { codigo: 'PAQUETE', nombre: 'Paquete', precio: 3, precioRural: null, mayoreo: null, pesoMaxKg: 50 },
  { codigo: 'CARTON', nombre: 'Cartón', precio: 3, precioRural: null, mayoreo: null, pesoMaxKg: 35 },
  { codigo: 'VALIJA', nombre: 'Valija', precio: 3, precioRural: null, mayoreo: null, pesoMaxKg: 25 },
  {
    codigo: 'TELA',
    nombre: 'Rollo de tela',
    precio: 1.25,
    precioRural: 1.5,
    mayoreo: { minimoExclusivo: 50, precio: 1 },
    pesoMaxKg: 50,
  },
  { codigo: 'PLUMON_PEQUENO', nombre: 'Plumón pequeño', precio: 3, precioRural: null, mayoreo: null, pesoMaxKg: 50 },
  { codigo: 'PLUMON_GRANDE', nombre: 'Plumón grande', precio: 4, precioRural: null, mayoreo: null, pesoMaxKg: 50 },
]

export const TIPO_CARGA_LABEL: Record<TipoCargaCodigo, string> = {
  SOBRE: 'Sobre',
  PAQUETE: 'Paquete',
  CARTON: 'Cartón',
  VALIJA: 'Valija',
  TELA: 'Rollo de tela',
  PLUMON_PEQUENO: 'Plumón pequeño',
  PLUMON_GRANDE: 'Plumón grande',
}

const TIPO_CARGA_PLURAL: Record<TipoCargaCodigo, [string, string]> = {
  SOBRE: ['sobre', 'sobres'],
  PAQUETE: ['paquete', 'paquetes'],
  CARTON: ['cartón', 'cartones'],
  VALIJA: ['valija', 'valijas'],
  TELA: ['rollo de tela', 'rollos de tela'],
  PLUMON_PEQUENO: ['plumón pequeño', 'plumones pequeños'],
  PLUMON_GRANDE: ['plumón grande', 'plumones grandes'],
}

export const ZONAS: Zona[] = ['URBANA', 'RURAL']

export const ZONA_LABEL: Record<Zona, string> = {
  URBANA: 'Urbana',
  RURAL: 'Rural',
}

/** El tipo cambia de precio según la zona de entrega (hoy, la tela). */
export function dependeDeZona(tipo: Pick<TipoCarga, 'precioRural' | 'precio'>): boolean {
  return tipo.precioRural !== null && tipo.precioRural !== tipo.precio
}

/** ¿Alguna línea del envío tiene precio distinto según la zona? */
export function zonaInfluye(items: Pick<ItemSolicitud, 'tipoCarga'>[], tipos: TipoCarga[]): boolean {
  return items.some((i) => {
    const t = tipos.find((x) => x.codigo === i.tipoCarga)
    return t ? dependeDeZona(t) : false
  })
}

/**
 * Precio por unidad de un tipo (contrato v8, «Precio por línea»): con mayoreo y más de `minimoExclusivo`
 * unidades del tipo en todo el envío, todas valen el precio por volumen; si no, rural/urbano.
 */
export function precioUnitario(tipo: TipoCarga, zona: Zona, unidadesDelTipo: number): { precio: number; mayoreo: boolean } {
  if (tipo.mayoreo && unidadesDelTipo > tipo.mayoreo.minimoExclusivo) return { precio: tipo.mayoreo.precio, mayoreo: true }
  return { precio: zona === 'RURAL' && tipo.precioRural !== null ? tipo.precioRural : tipo.precio, mayoreo: false }
}

/** Menor precio base publicado (sin contar el de mayoreo): la cifra «envíos desde». */
export function precioDesde(tipos: TipoCarga[]): number | null {
  return tipos.length ? Math.min(...tipos.map((t) => Math.min(t.precio, t.precioRural ?? t.precio))) : null
}

/** Precio publicado de un tipo: «$3,00» o, si cambia por zona, «$1,25 urbana · $1,50 rural». */
export function precioTipoTexto(tipo: TipoCarga): string {
  if (!dependeDeZona(tipo)) return formatCurrency(tipo.precio)
  return `${formatCurrency(tipo.precio)} urbana · ${formatCurrency(tipo.precioRural!)} rural`
}

/** Regla por volumen: «más de 50 rollos de tela: $1,00 c/u» (null si el tipo no tiene). */
export function mayoreoTexto(tipo: TipoCarga): string | null {
  if (!tipo.mayoreo) return null
  const { minimoExclusivo, precio } = tipo.mayoreo
  return `más de ${minimoExclusivo} ${nombreTipo(tipo.codigo, minimoExclusivo)}: ${formatCurrency(precio)} c/u`
}

/** «Más de 50 rollos de tela: $1,00 c/u» por cada tipo al que la cotización aplicó el precio por volumen. */
export function notasMayoreo(cotizacion: Pick<Cotizacion, 'items'>, tipos: TipoCarga[]): string[] {
  const codigos = [...new Set(cotizacion.items.filter((i) => i.mayoreo).map((i) => i.tipoCarga))]
  return codigos.flatMap((codigo) => {
    const tipo = tipos.find((t) => t.codigo === codigo)
    const texto = tipo ? mayoreoTexto(tipo) : null
    return texto ? [texto.charAt(0).toUpperCase() + texto.slice(1)] : []
  })
}

export function nombreTipo(tipo: TipoCargaCodigo, cantidad: number): string {
  const [singular, plural] = TIPO_CARGA_PLURAL[tipo]
  return cantidad === 1 ? singular : plural
}

/** "5 paquetes · 20 cartones": agrupa por tipo (suma cantidades) respetando el orden de aparición. */
export function resumenItems(items: Pick<ItemSolicitud, 'tipoCarga' | 'cantidad'>[]): string {
  const porTipo = new Map<TipoCargaCodigo, number>()
  for (const i of items) porTipo.set(i.tipoCarga, (porTipo.get(i.tipoCarga) ?? 0) + i.cantidad)
  return [...porTipo].map(([tipo, n]) => `${n} ${nombreTipo(tipo, n)}`).join(' · ')
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
