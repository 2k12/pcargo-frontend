import type { Estado, FormaPago, ItemSolicitud, TipoCarga, TipoCargaCodigo } from '@/types/api'

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

/** Catálogo por defecto (igual al backend); se usa mientras carga /tipos-carga. */
export const TIPOS_CARGA_DEFAULT: TipoCarga[] = [
  { codigo: 'SOBRE', nombre: 'Sobre', factor: 1.0, pesoIncluidoKg: 0.5, pesoMaxKg: 0.5 },
  { codigo: 'PAQUETE', nombre: 'Paquete', factor: 1.4, pesoIncluidoKg: 2, pesoMaxKg: 30 },
  { codigo: 'CARTON', nombre: 'Cartón', factor: 1.6, pesoIncluidoKg: 2, pesoMaxKg: 40 },
  { codigo: 'VALIJA', nombre: 'Valija', factor: 1.8, pesoIncluidoKg: 2, pesoMaxKg: 25 },
]

export const TIPO_CARGA_LABEL: Record<TipoCargaCodigo, string> = {
  SOBRE: 'Sobre',
  PAQUETE: 'Paquete',
  CARTON: 'Cartón',
  VALIJA: 'Valija',
}

const TIPO_CARGA_PLURAL: Record<TipoCargaCodigo, [string, string]> = {
  SOBRE: ['sobre', 'sobres'],
  PAQUETE: ['paquete', 'paquetes'],
  CARTON: ['cartón', 'cartones'],
  VALIJA: ['valija', 'valijas'],
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
