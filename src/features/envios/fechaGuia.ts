// Fecha de la guía (contrato v18): `AAAA-MM-DD` de Ecuador, hoy o posterior hasta hoy + 90 días.
import { esFecha, fechaEC } from '@/features/dashboard/domain'
import type { Envio } from '@/types/api'

/** Días hacia adelante que admite la fecha de la guía (igual que el backend). */
export const MAX_DIAS_FECHA_GUIA = 90

const DIA_MS = 24 * 60 * 60 * 1000

/** Fecha de hoy en Ecuador (`AAAA-MM-DD`). */
export const hoyEC = (ahora: number = Date.now()): string => fechaEC(ahora)

/** Suma días a una fecha `AAAA-MM-DD` (calendario, sin husos). */
export function sumarDias(fecha: string, dias: number): string {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * DIA_MS).toISOString().slice(0, 10)
}

/** Límites del selector: hoy … hoy + 90 (Ecuador). */
export function rangoFechaGuia(ahora: number = Date.now()): { min: string; max: string } {
  const min = hoyEC(ahora)
  return { min, max: sumarDias(min, MAX_DIAS_FECHA_GUIA) }
}

/** Valida la fecha elegida igual que el servidor. Devuelve el mensaje de error o `null`. */
export function validarFechaGuia(fecha: string | undefined | null, ahora: number = Date.now()): string | null {
  if (!fecha) return null // vacío → hoy
  if (!esFecha(fecha)) return 'Fecha inválida'
  const { min, max } = rangoFechaGuia(ahora)
  if (fecha < min) return 'La fecha de la guía no puede ser anterior a hoy'
  if (fecha > max) return `La fecha de la guía puede ser como máximo ${MAX_DIAS_FECHA_GUIA} días después de hoy`
  return null
}

/** Día (Ecuador) en que se registró el envío. */
export const diaRegistro = (envio: Pick<Envio, 'registro'>): string => {
  const ms = Date.parse(envio.registro.fecha)
  return Number.isNaN(ms) ? '' : fechaEC(ms)
}

/** Fecha de la guía del envío; respaldo: el día de registro (envíos o respuestas sin `fechaGuia`). */
export const fechaGuiaDe = (envio: Pick<Envio, 'registro'> & { fechaGuia?: string | null }): string =>
  envio.fechaGuia && esFecha(envio.fechaGuia) ? envio.fechaGuia : diaRegistro(envio)

/** La guía lleva una fecha distinta del día en que se registró. */
export const fechaGuiaDistinta = (envio: Pick<Envio, 'registro'> & { fechaGuia?: string | null }): boolean => {
  const registro = diaRegistro(envio)
  return !!registro && fechaGuiaDe(envio) !== registro
}

const fmtDiaLargo = new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const fmtDiaCorto = new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

/** «martes, 20 de octubre de 2026» a partir de `AAAA-MM-DD`. */
export const fechaLarga = (fecha: string): string => fmtDiaLargo.format(new Date(`${fecha}T00:00:00Z`))

/** «20/10/2026» a partir de `AAAA-MM-DD` (vacío si no es una fecha). */
export const fechaCorta = (fecha: string): string => (esFecha(fecha) ? fmtDiaCorto.format(new Date(`${fecha}T00:00:00Z`)) : '')

const fmtDiaMedio = new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeZone: 'UTC' })

/** «20 oct 2026» a partir de `AAAA-MM-DD` (mismo estilo que `formatDate`); «—» si no es una fecha. */
export const fechaMedia = (fecha: string): string => (esFecha(fecha) ? fmtDiaMedio.format(new Date(`${fecha}T00:00:00Z`)) : '—')
