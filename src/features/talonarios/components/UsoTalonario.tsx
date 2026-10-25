import { cn } from '@/lib/utils'
import type { EstadoGuiaTalonario, TalonarioResumen } from '@/types/api'
import { ESTADO_GUIA_LABEL, resumenUso, segmentosUso } from '../domain'

/** Color de cada estado (punto y barra): registrada en verde de marca, anulada en rojo tenue, disponible neutra. */
const COLOR_ESTADO_GUIA: Record<EstadoGuiaTalonario, string> = {
  USADA: 'bg-brand-green',
  ANULADA: 'bg-destructive/70',
  DISPONIBLE: 'bg-muted-foreground/30',
}

/** Estado de una guía del talonario: punto de color y texto (sin fondos que compitan con la tabla). */
export function EstadoGuia({ estado, className }: { estado: EstadoGuiaTalonario; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs whitespace-nowrap', className)}>
      <span aria-hidden className={cn('size-1.5 rounded-full', COLOR_ESTADO_GUIA[estado])} />
      {ESTADO_GUIA_LABEL[estado]}
    </span>
  )
}

/** Barra fina de uso del talonario con su resumen («6 disponibles · 3 registradas»). */
export function UsoTalonario({
  talonario,
  className,
}: {
  talonario: Pick<TalonarioResumen, 'cantidad' | 'disponibles' | 'usadas' | 'anuladas'>
  className?: string
}) {
  const segmentos = segmentosUso(talonario)
  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        {segmentos.map((s) => (
          <span key={s.estado} className={cn('h-full', COLOR_ESTADO_GUIA[s.estado])} style={{ width: `${s.porcentaje}%` }} />
        ))}
      </div>
      <p className="truncate text-xs text-muted-foreground tabular-nums">{resumenUso(talonario)}</p>
    </div>
  )
}
