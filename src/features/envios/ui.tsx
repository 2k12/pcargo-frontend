import { Box, Luggage, Mail, Package, type LucideIcon } from 'lucide-react'
import type { Estado, FormaPago, TipoCargaCodigo } from '@/types/api'

export const TIPO_CARGA_ICON: Record<TipoCargaCodigo, LucideIcon> = {
  SOBRE: Mail,
  PAQUETE: Package,
  CARTON: Box,
  VALIJA: Luggage,
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
