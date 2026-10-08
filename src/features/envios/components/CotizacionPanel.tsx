import { Loader2 } from 'lucide-react'
import { errorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { CotizacionRequest } from '@/types/api'
import { useCotizacion } from '../hooks'

/** Muestra la cotización en vivo consultando POST /envios/cotizar. */
export function CotizacionPanel({ request }: { request: CotizacionRequest | null }) {
  const { data, isFetching, error } = useCotizacion(request)

  return (
    <div className="rounded-xl border bg-muted/30 p-4" aria-live="polite">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Costo estimado</span>
        {isFetching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      </div>
      {!request ? (
        <p className="mt-1 text-sm text-muted-foreground">Completa ruta, tipo y peso para cotizar.</p>
      ) : error ? (
        <p className="mt-1 text-sm text-destructive">{errorMessage(error)}</p>
      ) : data ? (
        <>
          <p data-testid="cotizacion-total" className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {formatCurrency(data.costo)}
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div>
              <dt>Tarifa base</dt>
              <dd className="text-foreground tabular-nums">{formatCurrency(data.tarifaBase)}</dd>
            </div>
            <div>
              <dt>Factor</dt>
              <dd className="text-foreground tabular-nums">×{data.factor}</dd>
            </div>
            <div>
              <dt>Recargo peso</dt>
              <dd className="text-foreground tabular-nums">{formatCurrency(data.recargoPeso)}</dd>
            </div>
          </dl>
        </>
      ) : null}
    </div>
  )
}
