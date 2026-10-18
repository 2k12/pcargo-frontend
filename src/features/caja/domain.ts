// Cierre de caja (contrato v12): reglas puras, sin React.
import { z } from 'zod'
import { formatCurrency } from '@/lib/format'
import type { TipoCobro } from '@/types/api'

export const TIPO_COBRO_LABEL: Record<TipoCobro, string> = {
  ORIGEN: 'En oficina',
  CONTRA_ENTREGA: 'Contra entrega',
  DEVOLUCION: 'Devolución',
}

export const TIPO_COBRO_DESCRIPCION: Record<TipoCobro, string> = {
  ORIGEN: 'Envío pagado al registrarlo',
  CONTRA_ENTREGA: 'Cobrado al entregar un envío «Al cobro»',
  DEVOLUCION: 'Reembolso de un envío cancelado',
}

/** Redondeo a centavos igual que el servidor (`round2`). */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100

/** diferencia = entregado − esperado: negativa es faltante, positiva es sobrante. */
export function diferenciaCaja(entregado: number, esperado: number): number {
  const d = round2(entregado - esperado)
  return Object.is(d, -0) ? 0 : d
}

export type SentidoDiferencia = 'cuadra' | 'faltante' | 'sobrante'

export function sentidoDiferencia(diferencia: number): SentidoDiferencia {
  if (diferencia === 0) return 'cuadra'
  return diferencia < 0 ? 'faltante' : 'sobrante'
}

/** «Cuadra», «Faltan $2,00», «Sobran $0,50». */
export function textoDiferencia(diferencia: number): string {
  const sentido = sentidoDiferencia(diferencia)
  if (sentido === 'cuadra') return 'Cuadra'
  return `${sentido === 'faltante' ? 'Faltan' : 'Sobran'} ${formatCurrency(Math.abs(diferencia))}`
}

/** Tono (tokens de la marca) de una diferencia: faltante en rojo, sobrante en azul, cuadra en verde. */
export const TONO_DIFERENCIA: Record<SentidoDiferencia, string> = {
  cuadra: 'text-brand-green-text',
  faltante: 'text-destructive',
  sobrante: 'text-brand-blue-text',
}

/**
 * Lee un monto escrito a mano («12,50», «12.5», «$ 12»): ≥ 0 y con hasta 2 decimales.
 * Devuelve null si no es válido.
 */
export function parseMonto(texto: string): number | null {
  const limpio = texto.replace(/[$\s]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null
  const n = Number(limpio)
  return Number.isFinite(n) ? n : null
}

export const MAX_NOTA_CIERRE = 300
export const MENSAJE_NOTA_DIFERENCIA = 'Explica la diferencia (obligatorio cuando no cuadra)'

/** Formulario del cierre: la nota es obligatoria si el monto entregado no coincide con el esperado. */
export function crearCierreSchema(esperado: number) {
  return z
    .object({
      monto: z.string().trim().min(1, 'Escribe cuánto entrega').refine((v) => parseMonto(v) !== null, 'Monto inválido (hasta 2 decimales)'),
      nota: z.string().trim().max(MAX_NOTA_CIERRE, `Máximo ${MAX_NOTA_CIERRE} caracteres`),
    })
    .superRefine((v, ctx) => {
      const monto = parseMonto(v.monto)
      if (monto !== null && diferenciaCaja(monto, esperado) !== 0 && !v.nota) {
        ctx.addIssue({ code: 'custom', path: ['nota'], message: MENSAJE_NOTA_DIFERENCIA })
      }
    })
}

export type CierreFormValues = z.infer<ReturnType<typeof crearCierreSchema>>
