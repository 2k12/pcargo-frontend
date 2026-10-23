import { CalendarClock } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Envio } from '@/types/api'
import { fechaGuiaDe, fechaGuiaDistinta, fechaMedia } from '../fechaGuia'

/**
 * Fecha de la guía (contrato v18) para listas y tarjetas. Si difiere del día de registro se marca
 * con un ícono discreto; el detalle (registrado el …) queda en el título y para lectores de pantalla.
 */
export function FechaGuiaTexto({ envio, className }: { envio: Pick<Envio, 'registro' | 'fechaGuia'>; className?: string }) {
  const distinta = fechaGuiaDistinta(envio)
  const registrada = `Registrada el ${formatDate(envio.registro.fecha)}`
  return (
    <span
      className={cn('inline-flex items-center gap-1 tabular-nums', className)}
      title={distinta ? `Fecha de la guía · ${registrada}` : undefined}
    >
      {distinta && <CalendarClock aria-hidden className="size-3 shrink-0" />}
      {fechaMedia(fechaGuiaDe(envio))}
      {distinta && <span className="sr-only">(fecha de la guía; {registrada.toLowerCase()})</span>}
    </span>
  )
}
