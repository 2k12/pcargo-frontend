import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { EventoHistorial } from '@/types/api'
import { ESTADO_LABEL } from '../domain'
import { ESTADO_DOT } from '../ui'

/** Línea de tiempo del historial, del evento más reciente al más antiguo. */
export function HistorialTimeline({ eventos }: { eventos: EventoHistorial[] }) {
  const ordenados = [...eventos].sort((a, b) => b.fecha.localeCompare(a.fecha))
  if (ordenados.length === 0) return <p className="text-sm text-muted-foreground">Sin movimientos.</p>
  return (
    <ol className="relative space-y-5 border-l pl-5">
      {ordenados.map((ev, i) => (
        <li key={`${ev.estado}-${ev.fecha}-${i}`} className="relative">
          <span
            className={cn(
              'absolute top-1 -left-[25px] size-2.5 rounded-full ring-4 ring-background',
              ESTADO_DOT[ev.estado],
            )}
          />
          <p className="text-sm font-medium">{ESTADO_LABEL[ev.estado]}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(ev.fecha)}
            {ev.usuario && ` · ${ev.usuario}`}
          </p>
          {ev.nota && <p className="mt-1 text-sm text-muted-foreground">{ev.nota}</p>}
        </li>
      ))}
    </ol>
  )
}
