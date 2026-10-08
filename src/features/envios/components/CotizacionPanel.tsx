import { Loader2 } from 'lucide-react'
import { errorMessage } from '@/lib/api'
import { formatCurrency, formatPeso } from '@/lib/format'
import type { CotizacionRequest } from '@/types/api'
import { nombreTipo, piezasLabel } from '../domain'
import { useCotizacion } from '../hooks'

/** Muestra la cotización en vivo consultando POST /envios/cotizar (con desglose por ítem). */
export function CotizacionPanel({ request }: { request: CotizacionRequest | null }) {
  const { data, isFetching, error } = useCotizacion(request)

  return (
    <div className="rounded-xl border bg-muted/30 p-4" aria-live="polite">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Costo estimado</span>
        {isFetching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      </div>
      {!request ? (
        <p className="mt-1 text-sm text-muted-foreground">Completa la ruta y los ítems (tipo, cantidad y peso) para cotizar.</p>
      ) : error ? (
        <p className="mt-1 text-sm text-destructive">{errorMessage(error)}</p>
      ) : data ? (
        <>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
            <p data-testid="cotizacion-total" className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatCurrency(data.costo)}
            </p>
            <p className="text-xs text-muted-foreground">
              {piezasLabel(data.totalPiezas)} · {formatPeso(data.pesoTotalKg)} · tarifa base {formatCurrency(data.tarifaBase)}
            </p>
          </div>
          <ul className="mt-3 space-y-1 border-t pt-3 text-xs" aria-label="Desglose de la cotización">
            {data.items.map((i, idx) => (
              <li key={`${i.tipoCarga}-${idx}`} className="flex items-center justify-between gap-2 tabular-nums">
                <span className="text-muted-foreground">
                  {i.cantidad} {nombreTipo(i.tipoCarga, i.cantidad)} de {formatPeso(i.pesoKg)} × {formatCurrency(i.costoUnitario)}
                </span>
                <span className="font-medium">{formatCurrency(i.subtotal)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
