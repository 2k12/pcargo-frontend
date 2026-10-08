import { ArrowRight } from 'lucide-react'
import { INTERACTIVA, SUPERFICIE } from '@/lib/estilos'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Envio } from '@/types/api'
import { piezasLabel, resumenItems } from '../domain'
import { EstadoBadge } from './EstadoBadge'

/** Tarjeta compacta de un envío; toda la tarjeta es un botón que abre el detalle. */
export function EnvioCard({ envio: e, onSelect, className }: { envio: Envio; onSelect: (id: string) => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(e.id)}
      className={cn(
        'flex w-full flex-col gap-2 p-3 text-left text-sm',
        SUPERFICIE,
        INTERACTIVA,
        className,
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">{e.codigo}</span>
        <EstadoBadge estado={e.estado} />
      </span>
      <span className="flex items-end justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate font-medium">{e.destinatario.nombre}</span>
          <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            {e.ruta.origen}
            {e.ruta.origen !== e.ruta.destino && (
              <>
                <ArrowRight className="size-3 shrink-0" />
                {e.ruta.destino}
              </>
            )}
            <span aria-hidden>·</span>
            <span className="truncate" title={resumenItems(e.items)}>
              {piezasLabel(e.totalPiezas)}
            </span>
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-medium tabular-nums">{formatCurrency(e.costo)}</span>
          <span className="block text-xs text-muted-foreground">{formatDate(e.registro.fecha)}</span>
        </span>
      </span>
    </button>
  )
}
