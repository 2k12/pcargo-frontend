// Talonarios de guías en blanco (contrato v20): lógica pura, sin React ni jsPDF.
import { z } from 'zod'
import { fechaEC } from '@/features/dashboard/domain'
import { numeroGuiaImpreso } from '@/features/envios/guiaImprimible'
import type { EstadoGuiaTalonario, GuiaDeTalonario, Talonario, TalonarioResumen } from '@/types/api'

export const MIN_CANTIDAD = 1
export const MAX_CANTIDAD = 50
export const CANTIDAD_DEFECTO = 10
export const MAX_NOTA = 120
export const MIN_MOTIVO = 3
export const MAX_MOTIVO = 200

export const ESTADO_GUIA_LABEL: Record<EstadoGuiaTalonario, string> = {
  DISPONIBLE: 'Disponible',
  USADA: 'Registrada',
  ANULADA: 'Anulada',
}

/** «0040500–0040509» (una sola guía: «0040500»). */
export function rangoTalonario(t: Pick<TalonarioResumen, 'desde' | 'hasta'>): string {
  const desde = numeroGuiaImpreso(t.desde)
  return t.hasta > t.desde ? `${desde}–${numeroGuiaImpreso(t.hasta)}` : desde
}

/** Día (Ecuador, `AAAA-MM-DD`) en que se reservó el talonario: la fecha mínima de sus guías. */
export function diaTalonario(creadoEn: string): string {
  const ms = Date.parse(creadoEn)
  return Number.isNaN(ms) ? '' : fechaEC(ms)
}

/** Guía en blanco lista para registrarse: el formulario la abre con su número fijo y su fecha mínima. */
export interface GuiaParaRegistrar {
  numeroGuia: number
  /** `AAAA-MM-DD`: día del talonario; la fecha de la guía puede ir desde aquí. */
  fechaMinima: string
}

export function guiaParaRegistrar(numeroGuia: number, creadoEn: string): GuiaParaRegistrar {
  return { numeroGuia, fechaMinima: diaTalonario(creadoEn) }
}

/** Números aún disponibles (para reimprimir solo esos). */
export const numerosDisponibles = (t: Pick<Talonario, 'guias'>): number[] =>
  t.guias.filter((g) => g.estado === 'DISPONIBLE').map((g) => g.numeroGuia)

/** Todos los números del talonario, en orden (al crearlo, todos están disponibles). */
export function numerosDe(t: Pick<TalonarioResumen, 'desde' | 'hasta'>): number[] {
  return Array.from({ length: Math.max(0, t.hasta - t.desde + 1) }, (_, i) => t.desde + i)
}

/** Segmentos de la barra de uso (porcentajes que suman 100; vacío si no hay guías). */
export function segmentosUso(t: Pick<TalonarioResumen, 'cantidad' | 'disponibles' | 'usadas' | 'anuladas'>) {
  const total = t.disponibles + t.usadas + t.anuladas || t.cantidad
  if (!total) return []
  return (
    [
      { estado: 'USADA', n: t.usadas },
      { estado: 'ANULADA', n: t.anuladas },
      { estado: 'DISPONIBLE', n: t.disponibles },
    ] as { estado: EstadoGuiaTalonario; n: number }[]
  )
    .filter((s) => s.n > 0)
    .map((s) => ({ ...s, porcentaje: (s.n / total) * 100 }))
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** «6 disponibles · 3 registradas · 1 anulada» (omite los ceros salvo las disponibles). */
export function resumenUso(t: Pick<TalonarioResumen, 'disponibles' | 'usadas' | 'anuladas'>): string {
  return [
    plural(t.disponibles, 'disponible', 'disponibles'),
    t.usadas ? plural(t.usadas, 'registrada', 'registradas') : '',
    t.anuladas ? plural(t.anuladas, 'anulada', 'anuladas') : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Lo que se le dice al operador cuando escanea un número que es de un talonario y no es un envío. */
export function avisoGuiaTalonario(g: Pick<GuiaDeTalonario, 'numeroGuia' | 'estado' | 'motivo'>): string {
  const n = numeroGuiaImpreso(g.numeroGuia)
  if (g.estado === 'DISPONIBLE') return `La guía ${n} es de un talonario y todavía no está registrada.`
  if (g.estado === 'ANULADA') return `La guía ${n} está anulada${g.motivo ? `: ${g.motivo}` : '.'}`
  return `La guía ${n} ya está registrada.`
}

export const nuevoTalonarioSchema = z.object({
  cantidad: z
    .number({ message: `Entre ${MIN_CANTIDAD} y ${MAX_CANTIDAD}` })
    .int('Debe ser un número entero')
    .min(MIN_CANTIDAD, `Mínimo ${MIN_CANTIDAD}`)
    .max(MAX_CANTIDAD, `Máximo ${MAX_CANTIDAD} guías por talonario`),
  nota: z.string().trim().max(MAX_NOTA, `Máximo ${MAX_NOTA} caracteres`).optional(),
})
export type NuevoTalonarioValues = z.infer<typeof nuevoTalonarioSchema>

export const anularGuiaSchema = z.object({
  motivo: z.string().trim().min(MIN_MOTIVO, 'Escribe el motivo (mínimo 3 caracteres)').max(MAX_MOTIVO, `Máximo ${MAX_MOTIVO} caracteres`),
})
export type AnularGuiaValues = z.infer<typeof anularGuiaSchema>

/** Datos que van en cada guía en blanco del PDF. */
export interface DatosGuiaEnBlanco {
  numeroGuia: number
  numero: string
  urlSeguimiento: string
  urlTerminos: string
  /** Marca discreta en la banda: «TALONARIO · Camión Quito – sábado». */
  marca: string
}

/** Textos de una guía en blanco: número impreso, la misma URL de seguimiento que una guía normal y la marca. */
export function datosGuiaEnBlanco(numeroGuia: number, nota: string | null | undefined, origen: string = window.location.origin): DatosGuiaEnBlanco {
  const base = origen.replace(/\/+$/, '')
  const n = nota?.trim()
  return {
    numeroGuia,
    numero: numeroGuiaImpreso(numeroGuia),
    urlSeguimiento: `${base}/seguimiento/${numeroGuia}`,
    urlTerminos: `${base}/terminos`,
    marca: n ? `TALONARIO · ${n}` : 'TALONARIO',
  }
}

/** «talonario-0040500-0040509.pdf» (ordenadas). */
export function nombreArchivoTalonario(numeros: number[]): string {
  const orden = [...numeros].sort((a, b) => a - b)
  const desde = numeroGuiaImpreso(orden[0]!)
  const hasta = numeroGuiaImpreso(orden[orden.length - 1]!)
  return orden.length === 1 ? `talonario-${desde}.pdf` : `talonario-${desde}-${hasta}.pdf`
}
