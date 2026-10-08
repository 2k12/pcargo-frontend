import type { Estado, TipoCarga, TipoCargaCodigo } from '@/types/api'

export const ESTADOS: Estado[] = ['REGISTRADO', 'EN_TRANSITO', 'EN_REPARTO', 'ENTREGADO', 'CANCELADO']

/** Flujo principal (sin CANCELADO) para el stepper de seguimiento. */
export const FLUJO_ESTADOS: Estado[] = ['REGISTRADO', 'EN_TRANSITO', 'EN_REPARTO', 'ENTREGADO']

export const ESTADO_LABEL: Record<Estado, string> = {
  REGISTRADO: 'Registrado',
  EN_TRANSITO: 'En tránsito',
  EN_REPARTO: 'En reparto',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

/** Etiqueta de la acción que lleva al estado destino. */
export const ACCION_LABEL: Record<Estado, string> = {
  REGISTRADO: 'Registrar',
  EN_TRANSITO: 'Despachar',
  EN_REPARTO: 'Enviar a reparto',
  ENTREGADO: 'Marcar entregado',
  CANCELADO: 'Cancelar envío',
}

const TRANSICIONES: Record<Estado, Estado[]> = {
  REGISTRADO: ['EN_TRANSITO', 'CANCELADO'],
  EN_TRANSITO: ['EN_REPARTO'],
  EN_REPARTO: ['ENTREGADO'],
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
