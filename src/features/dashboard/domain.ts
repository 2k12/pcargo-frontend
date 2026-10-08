import type { Estado, Resumen } from '@/types/api'

/**
 * Estados agrupados por significado (Gestalt: proximidad). El orden de los grupos es también
 * el orden de los segmentos en la barra, para que cada grupo se lea como un bloque continuo.
 */
export const GRUPOS_ESTADO: { clave: 'curso' | 'gestion' | 'cerrados'; titulo: string; estados: Estado[] }[] = [
  { clave: 'curso', titulo: 'En curso', estados: ['REGISTRADO', 'EN_TRANSITO', 'EN_REPARTO'] },
  { clave: 'gestion', titulo: 'Requieren gestión', estados: ['NOVEDAD', 'NO_ENTREGADO'] },
  { clave: 'cerrados', titulo: 'Cerrados', estados: ['ENTREGADO', 'CANCELADO'] },
]

const ORDEN_ESTADOS = GRUPOS_ESTADO.flatMap((g) => g.estados)

export interface SegmentoEstado {
  estado: Estado
  total: number
  /** Porcentaje sobre el total de envíos (0–100). */
  pct: number
}

/** Distribución por estado en el orden de los grupos, con porcentaje. */
export function segmentosEstado(r: Pick<Resumen, 'porEstado' | 'totalEnvios'>): SegmentoEstado[] {
  return ORDEN_ESTADOS.map((estado) => {
    const total = r.porEstado[estado] ?? 0
    return { estado, total, pct: r.totalEnvios > 0 ? (total / r.totalEnvios) * 100 : 0 }
  })
}

/** Total de envíos de un grupo de estados. */
export function totalGrupo(r: Pick<Resumen, 'porEstado'>, estados: Estado[]): number {
  return estados.reduce((acc, e) => acc + (r.porEstado[e] ?? 0), 0)
}

/** Envíos que se están moviendo: en tránsito + en reparto. */
export function enCamino(r: Pick<Resumen, 'porEstado'>): number {
  return (r.porEstado.EN_TRANSITO ?? 0) + (r.porEstado.EN_REPARTO ?? 0)
}

/** Envíos que requieren gestión: no entregados + con novedad. */
export function requierenAtencion(r: Pick<Resumen, 'porEstado'>): number {
  return (r.porEstado.NO_ENTREGADO ?? 0) + (r.porEstado.NOVEDAD ?? 0)
}

/**
 * Tasa de entrega: entregados sobre envíos cerrados (entregados + no entregados).
 * `null` si todavía no hay envíos cerrados.
 */
export function tasaEntrega(r: Pick<Resumen, 'porEstado'>): number | null {
  const entregados = r.porEstado.ENTREGADO ?? 0
  const cerrados = entregados + (r.porEstado.NO_ENTREGADO ?? 0)
  return cerrados === 0 ? null : Math.round((entregados / cerrados) * 100)
}

/** Ticket promedio: ingresos / envíos no cancelados. */
export function ticketPromedio(r: Pick<Resumen, 'porEstado' | 'totalEnvios' | 'ingresos'>): number {
  const validos = r.totalEnvios - (r.porEstado.CANCELADO ?? 0)
  return validos > 0 ? r.ingresos / validos : 0
}
