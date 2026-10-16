import { cn } from '@/lib/utils'
import type { Estado } from '@/types/api'
import { ESTADO_LABEL } from '../domain'
import { ESTADO_DOT, ESTADO_TONO } from '../ui'

export function EstadoBadge({ estado, className }: { estado: Estado; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        ESTADO_TONO[estado],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', ESTADO_DOT[estado])} />
      {ESTADO_LABEL[estado]}
    </span>
  )
}

/** Estado sin fondo (punto + texto) para listas densas: el color queda solo en el punto. */
export function EstadoPunto({ estado, className }: { estado: Estado; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm whitespace-nowrap', className)}>
      <span className={cn('size-1.5 shrink-0 rounded-full', ESTADO_DOT[estado])} aria-hidden />
      {ESTADO_LABEL[estado]}
    </span>
  )
}
