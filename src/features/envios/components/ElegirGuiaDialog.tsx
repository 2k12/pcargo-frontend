import { ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { rutaLabel } from '@/features/rutas/hooks'
import type { Envio } from '@/types/api'
import { etiquetaCoincidencia } from '../guia'
import { EstadoPunto } from './EstadoBadge'

/**
 * El mismo número es el del sistema de un envío y la guía física de otro (contrato v21):
 * se pide elegir cuál abrir.
 */
export function ElegirGuiaDialog({
  numero,
  envios,
  onElegir,
  onCerrar,
}: {
  /** Número buscado, sin ceros a la izquierda. */
  numero: string
  envios: Envio[]
  onElegir: (envio: Envio) => void
  onCerrar: () => void
}) {
  return (
    <Dialog open={envios.length > 0} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Cuál guía {numero}?</DialogTitle>
          <DialogDescription>Este número es de dos envíos: el número del sistema de uno y la guía física de otro.</DialogDescription>
        </DialogHeader>
        <ul className="-mx-1 space-y-1" aria-label="Envíos con ese número">
          {envios.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onElegir(e)}
                className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-medium tabular-nums">{etiquetaCoincidencia(e, numero)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {e.destinatario.nombre} · {rutaLabel(e.ruta)}
                  </span>
                </span>
                <EstadoPunto estado={e.estado} className="shrink-0 text-xs" />
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
