import { Plug } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrigenEnvio } from '@/types/api'

/**
 * Canal por el que ingresó el envío (contrato v10). El panel es lo habitual y se muestra discreto;
 * un envío por API se destaca con el nombre de la integración.
 * `ocultarPanel` omite la insignia en los envíos del panel (listas compactas).
 */
export function OrigenBadge({
  origen,
  ocultarPanel = false,
  className,
}: {
  origen: OrigenEnvio | null | undefined
  ocultarPanel?: boolean
  className?: string
}) {
  if (!origen || origen.canal === 'PANEL') {
    if (ocultarPanel) return null
    return (
      <span
        data-testid="origen-badge"
        className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground ring-1 ring-foreground/10', className)}
      >
        Panel
      </span>
    )
  }
  const nombre = origen.integracion ?? 'Integración'
  return (
    <span
      data-testid="origen-badge"
      title={`Ingresado por API: ${nombre}`}
      className={cn(
        'inline-flex max-w-full min-w-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-brand-blue-text ring-1 ring-primary/30',
        className,
      )}
    >
      <Plug className="size-3 shrink-0" aria-hidden />
      <span className="truncate">API · {nombre}</span>
    </span>
  )
}
