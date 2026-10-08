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

export type Periodo = 'hoy' | '7d' | '30d' | 'mes' | 'todo'

export const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'mes', label: 'Este mes' },
  { value: 'todo', label: 'Todo' },
]

export const esPeriodo = (v: string | null): v is Periodo => PERIODOS.some((p) => p.value === v)

/** Ecuador continental no tiene horario de verano: UTC−5, igual que el servidor. */
const OFFSET_EC_MS = -5 * 60 * 60 * 1000
const DIA_MS = 24 * 60 * 60 * 1000

/** Fecha local de Ecuador `YYYY-MM-DD`. */
export const fechaEC = (ms: number): string => new Date(ms + OFFSET_EC_MS).toISOString().slice(0, 10)

/** Rango `desde`–`hasta` (inclusive) de un periodo predefinido; `todo` no filtra por fecha. */
export function rangoPeriodo(periodo: Periodo, ahora: number = Date.now()): { desde?: string; hasta?: string } {
  const hoy = fechaEC(ahora)
  switch (periodo) {
    case 'hoy':
      return { desde: hoy, hasta: hoy }
    case '7d':
      return { desde: fechaEC(ahora - 6 * DIA_MS), hasta: hoy }
    case '30d':
      return { desde: fechaEC(ahora - 29 * DIA_MS), hasta: hoy }
    case 'mes':
      return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy }
    default:
      return {}
  }
}

/** El servidor envía la serie diaria de, como máximo, los últimos 92 días del rango. */
export const MAX_DIAS_SERIE = 92

/** Días del rango `desde`–`hasta`, ambos inclusive. */
export const diasEntre = (desde: string, hasta: string): number =>
  Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / DIA_MS) + 1

/** Valida un rango elegido a mano (fechas de Ecuador). Devuelve el mensaje de error o `null` si es válido. */
export function validarRango(desde: string, hasta: string, hoy: string = fechaEC(Date.now())): string | null {
  if (!esFecha(desde) || !esFecha(hasta)) return 'Elige la fecha de inicio y la de fin'
  if (desde > hasta) return '«Desde» no puede ser posterior a «Hasta»'
  if (hasta > hoy) return 'No puedes elegir fechas futuras'
  return null
}

const diaCorto = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const diaLargo = new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

/** "3 oct" / "sábado, 3 de octubre" a partir de `YYYY-MM-DD` (sin desfase de zona horaria). */
export const formatDia = (fecha: string, largo = false): string =>
  (largo ? diaLargo : diaCorto).format(new Date(`${fecha}T00:00:00Z`))

const FECHA = /^\d{4}-\d{2}-\d{2}$/

/** `YYYY-MM-DD` válido (para leer fechas de la URL sin confiar en ellas). */
export const esFecha = (v: string | null | undefined): v is string =>
  !!v && FECHA.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime())

/** Texto del rango elegido: "3 oct" o "1 oct – 7 oct". */
export const formatRango = (desde: string, hasta: string): string =>
  desde === hasta ? formatDia(desde) : `${formatDia(desde)} – ${formatDia(hasta)}`

/** Promedio diario y día pico de la serie. */
export function estadisticasSerie(serie: { fecha: string; envios: number; ingresos: number }[], metrica: 'envios' | 'ingresos') {
  const total = serie.reduce((a, d) => a + d[metrica], 0)
  const pico = serie.reduce<(typeof serie)[number] | null>((m, d) => (d[metrica] > (m?.[metrica] ?? 0) ? d : m), null)
  return { total, promedio: serie.length ? total / serie.length : 0, pico }
}
