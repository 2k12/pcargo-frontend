// Reporte diario de guías: lógica pura (orden de la lista y textos del PDF), sin React ni jsPDF.
import { fechaEC } from '@/features/dashboard/domain'
import { FORMA_PAGO_LABEL } from '@/features/envios/domain'
import { EMPRESA_GUIA, numeroGuiaImpreso, rutaGuia } from '@/features/envios/guiaImprimible'
import { formatCurrency } from '@/lib/format'
import type { Envio } from '@/types/api'

export const NOMBRE_REPORTE_DEFECTO = 'Reporte diario'

/** Fecha de hoy en Ecuador (`AAAA-MM-DD`). */
export const hoyEC = (ahora: number = Date.now()): string => fechaEC(ahora)

/** Mueve el elemento de la posición `desde` a la posición `hacia` (devuelve una lista nueva). */
export function mover<T>(lista: T[], desde: number, hacia: number): T[] {
  if (desde === hacia || desde < 0 || hacia < 0 || desde >= lista.length || hacia >= lista.length) return lista
  const copia = [...lista]
  const [item] = copia.splice(desde, 1)
  copia.splice(hacia, 0, item!)
  return copia
}

/** Suma de los valores de las guías (en centavos, para no arrastrar decimales de coma flotante). */
export const valorTotal = (envios: Pick<Envio, 'costo'>[]): number =>
  envios.reduce((s, e) => s + Math.round(e.costo * 100), 0) / 100

const fmtDiaLargo = new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const fmtGenerado = new Intl.DateTimeFormat('es-EC', {
  timeZone: 'America/Guayaquil',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** «martes, 20 de octubre de 2026» a partir de `AAAA-MM-DD`. */
export const fechaLarga = (fecha: string): string => fmtDiaLargo.format(new Date(`${fecha}T00:00:00Z`))

export interface FilaReporte {
  n: string
  guia: string
  ruta: string
  remitente: string
  destinatario: string
  pago: string
  valor: string
}

export interface DatosReporte {
  titulo: string
  fecha: string
  generado: string
  empresa: typeof EMPRESA_GUIA
  filas: FilaReporte[]
  totalGuias: string
  totalValor: string
  nombreArchivo: string
}

/** «reporte-diario-2026-10-20.pdf». */
export function nombreArchivoReporte(titulo: string, fecha: string): string {
  const base =
    titulo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'reporte'
  return `${base}-${fecha}.pdf`
}

/** Textos del reporte con las guías en el orden elegido. */
export function datosReporte(titulo: string, fecha: string, envios: Envio[], ahora: Date = new Date()): DatosReporte {
  const nombre = titulo.trim() || NOMBRE_REPORTE_DEFECTO
  return {
    titulo: nombre,
    fecha: fechaLarga(fecha),
    generado: fmtGenerado.format(ahora),
    empresa: EMPRESA_GUIA,
    filas: envios.map((e, i) => ({
      n: String(i + 1),
      guia: numeroGuiaImpreso(e.numeroGuia),
      ruta: rutaGuia(e.ruta),
      remitente: e.remitente.nombre,
      destinatario: e.destinatario.nombre,
      pago: FORMA_PAGO_LABEL[e.formaPago],
      valor: formatCurrency(e.costo),
    })),
    totalGuias: String(envios.length),
    totalValor: formatCurrency(valorTotal(envios)),
    nombreArchivo: nombreArchivoReporte(nombre, fecha),
  }
}
