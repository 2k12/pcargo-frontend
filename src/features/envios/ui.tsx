import { BedDouble, BedSingle, Box, Boxes, Luggage, Mail, Package, Scroll, type LucideIcon } from 'lucide-react'
import type { Estado, EstadoEntregaWebhook, FormaPago, TipoCargaCodigo } from '@/types/api'

/** Iconos de los tipos de la semilla; los tipos que cree el ADMIN usan `ICONO_TIPO_GENERICO`. */
const ICONO_TIPO_SEMILLA: Partial<Record<TipoCargaCodigo, LucideIcon>> = {
  SOBRE: Mail,
  PAQUETE: Package,
  CARTON: Box,
  VALIJA: Luggage,
  TELA: Scroll,
  PLUMON_PEQUENO: BedSingle,
  PLUMON_GRANDE: BedDouble,
}

export const ICONO_TIPO_GENERICO: LucideIcon = Boxes

/** Icono de un tipo de carga (contrato v11: los códigos son configurables). */
export function iconoTipoCarga(codigo: TipoCargaCodigo): LucideIcon {
  return ICONO_TIPO_SEMILLA[codigo] ?? ICONO_TIPO_GENERICO
}

export const ESTADO_TONO: Record<Estado, string> = {
  REGISTRADO: 'bg-muted text-foreground',
  EN_TRANSITO: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  EN_REPARTO: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  ENTREGADO: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  NO_ENTREGADO: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  NOVEDAD: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  CANCELADO: 'bg-destructive/10 text-destructive',
}

export const ESTADO_DOT: Record<Estado, string> = {
  REGISTRADO: 'bg-muted-foreground',
  EN_TRANSITO: 'bg-sky-500',
  EN_REPARTO: 'bg-amber-500',
  ENTREGADO: 'bg-emerald-500',
  NO_ENTREGADO: 'bg-rose-500',
  NOVEDAD: 'bg-violet-500',
  CANCELADO: 'bg-destructive',
}

export const FORMA_PAGO_TONO: Record<FormaPago, string> = {
  PAGADO: 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  AL_COBRO: 'border-amber-500/30 text-amber-700 dark:text-amber-300',
  CONTRATO: 'border-sky-500/30 text-sky-700 dark:text-sky-300',
  SEGURO: 'border-violet-500/30 text-violet-700 dark:text-violet-300',
}

/** Aviso de envíos que requieren gestión (no entregados / con novedad). */
export const ATENCION_TONO = 'bg-amber-500/10 text-amber-800 dark:text-amber-200'

/** Estado de una entrega de webhook (contrato v10). */
export const ENTREGA_WEBHOOK_TONO: Record<EstadoEntregaWebhook, string> = {
  PENDIENTE: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
  ENTREGADO: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  FALLIDO: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

/** Color del status HTTP en la auditoría: 2xx verde, 4xx ámbar, 5xx rojo, el resto neutro. */
export function tonoStatusHttp(status: number | null): string {
  if (status === null) return 'bg-muted text-muted-foreground'
  if (status >= 200 && status < 300) return ENTREGA_WEBHOOK_TONO.ENTREGADO
  if (status >= 400 && status < 500) return ENTREGA_WEBHOOK_TONO.PENDIENTE
  if (status >= 500) return ENTREGA_WEBHOOK_TONO.FALLIDO
  return 'bg-muted text-foreground'
}
