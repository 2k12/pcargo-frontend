import { Box, Luggage, Mail, Package, type LucideIcon } from 'lucide-react'
import type { Estado, TipoCargaCodigo } from '@/types/api'

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
  CANCELADO: 'bg-destructive/10 text-destructive',
}

export const ESTADO_DOT: Record<Estado, string> = {
  REGISTRADO: 'bg-muted-foreground',
  EN_TRANSITO: 'bg-sky-500',
  EN_REPARTO: 'bg-amber-500',
  ENTREGADO: 'bg-emerald-500',
  CANCELADO: 'bg-destructive',
}
