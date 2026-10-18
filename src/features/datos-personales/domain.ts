// Retención y eliminación de datos personales (contrato v12, LOPDP): reglas puras.
import { z } from 'zod'
import type { CanalSolicitud, DatosTitular, ResultadoDepuracion, SolicitudDatos } from '@/types/api'

export const MESES_MIN = 12
export const MESES_MAX = 120
export const MESES_DEFECTO = 12

export const politicaSchema = z.object({
  mesesRetencion: z
    .number({ message: `Entre ${MESES_MIN} y ${MESES_MAX} meses` })
    .int('Solo meses enteros')
    .min(MESES_MIN, `Mínimo ${MESES_MIN} meses`)
    .max(MESES_MAX, `Máximo ${MESES_MAX} meses`),
})

export const CANALES: CanalSolicitud[] = ['PRESENCIAL', 'CORREO', 'TELEFONO', 'WHATSAPP']

export const CANAL_LABEL: Record<CanalSolicitud, string> = {
  PRESENCIAL: 'Presencial',
  CORREO: 'Correo',
  TELEFONO: 'Teléfono',
  WHATSAPP: 'WhatsApp',
}

export const solicitudSchema = z.object({
  nombreTitular: z.string().trim().min(2, 'Escribe el nombre del titular').max(120, 'Máximo 120 caracteres'),
  canal: z.enum(['PRESENCIAL', 'CORREO', 'TELEFONO', 'WHATSAPP'], { message: 'Elige por dónde llegó la solicitud' }),
  nota: z.string().trim().max(300, 'Máximo 300 caracteres'),
})

export type SolicitudFormValues = z.infer<typeof solicitudSchema>

/** «1 envío», «3 envíos». */
export const contar = (n: number, singular: string, plural: string): string => `${n} ${n === 1 ? singular : plural}`

/** «12 meses», «2 años», «1 año y 6 meses». */
export function plazoTexto(meses: number): string {
  const anios = Math.floor(meses / 12)
  const resto = meses % 12
  if (anios === 0) return contar(meses, 'mes', 'meses')
  const a = contar(anios, 'año', 'años')
  return resto ? `${a} y ${contar(resto, 'mes', 'meses')}` : a
}

/** Qué hará la depuración (o qué hizo): «Anonimizará 3 envíos y eliminará 1 cliente». */
export function resumenDepuracion(r: Pick<ResultadoDepuracion, 'envios' | 'clientes' | 'evidencias'>): string[] {
  return [
    contar(r.envios, 'envío anonimizado', 'envíos anonimizados'),
    contar(r.clientes, 'cliente inactivo eliminado', 'clientes inactivos eliminados'),
    contar(r.evidencias, 'foto de evidencia borrada', 'fotos de evidencia borradas'),
  ]
}

export const sinNadaQueDepurar = (r: Pick<ResultadoDepuracion, 'envios' | 'clientes' | 'evidencias'>): boolean =>
  r.envios === 0 && r.clientes === 0 && r.evidencias === 0

/** ¿Hay algo asociado a ese teléfono? */
export const titularSinDatos = (t: DatosTitular): boolean => !t.cliente && t.envios.total === 0

/** Envíos terminados que todavía tienen datos personales (los que la solicitud anonimiza). */
export const porAnonimizar = (t: DatosTitular): number => Math.max(0, t.envios.terminados - t.envios.anonimizados)

/** Resultado de una solicitud atendida, en frases cortas. */
export function resumenSolicitud(r: SolicitudDatos['resultado']): string[] {
  const partes = [contar(r.envios, 'envío anonimizado', 'envíos anonimizados')]
  if (r.clientes) partes.push(contar(r.clientes, 'cliente eliminado', 'clientes eliminados'))
  if (r.evidencias) partes.push(contar(r.evidencias, 'foto borrada', 'fotos borradas'))
  if (r.usuariosDesactivados) partes.push(contar(r.usuariosDesactivados, 'acceso al portal desactivado', 'accesos al portal desactivados'))
  return partes
}
