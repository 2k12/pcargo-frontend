import { formatCurrency, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Cobro } from '@/types/api'
import { TIPO_COBRO_LABEL } from '../domain'

/** Cobros con su número de guía: lista plana con separadores finos (misma lectura en todas las vistas). */
export function ListaCobros({ cobros, className }: { cobros: Cobro[]; className?: string }) {
  if (cobros.length === 0) return <p className={cn('text-sm text-muted-foreground', className)}>Sin cobros.</p>
  return (
    <ul className={cn('divide-y text-sm', className)} aria-label="Cobros">
      {cobros.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-3 py-2">
          <span className="min-w-0">
            <span className="block font-mono tabular-nums">Guía {c.numeroGuia}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {TIPO_COBRO_LABEL[c.tipo]} · {formatDateTime(c.fecha)}
            </span>
          </span>
          <span className={cn('shrink-0 font-medium tabular-nums', c.monto < 0 && 'text-destructive')}>{formatCurrency(c.monto)}</span>
        </li>
      ))}
    </ul>
  )
}
