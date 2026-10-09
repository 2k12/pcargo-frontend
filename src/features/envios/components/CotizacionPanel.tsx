import { Loader2 } from 'lucide-react'
import { errorMessage } from '@/lib/api'
import { formatCurrency, formatPeso } from '@/lib/format'
import type { CotizacionRequest, TipoCarga } from '@/types/api'
import { nombreTipo, notasMayoreo, piezasLabel, TIPOS_CARGA_DEFAULT, ZONA_LABEL } from '../domain'
import { useCotizacion } from '../hooks'

/** Muestra la cotización en vivo consultando POST /envios/cotizar (con desglose por ítem). */
export function CotizacionPanel({
  request,
  tipos = TIPOS_CARGA_DEFAULT,
}: {
  request: CotizacionRequest | null
  tipos?: TipoCarga[]
}) {
  const { data, isFetching, error } = useCotizacion(request)
  const notas = data ? notasMayoreo(data, tipos) : []

  return (
    <div className="rounded-xl bg-muted/50 p-4" aria-live="polite">
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
              {piezasLabel(data.totalPiezas)} · {formatPeso(data.pesoTotalKg)} · zona {ZONA_LABEL[data.zona].toLowerCase()}
            </p>
          </div>
          <ul className="mt-3 space-y-1 border-t pt-3 text-xs" aria-label="Desglose de la cotización">
            {data.items.map((i, idx) => (
              <li key={`${i.tipoCarga}-${idx}`} className="flex items-center justify-between gap-2 tabular-nums">
                <span className="text-muted-foreground">
                  {i.cantidad} {nombreTipo(i.tipoCarga, i.cantidad)} de {formatPeso(i.pesoKg)} × {formatCurrency(i.costoUnitario)}
                  {i.mayoreo && (
                    <>
                      {' '}
                      <span className="ml-1 rounded bg-background px-1 py-px text-foreground ring-1 ring-foreground/10">por volumen</span>
                    </>
                  )}
                </span>
                <span className="font-medium">{formatCurrency(i.subtotal)}</span>
              </li>
            ))}
          </ul>
          {notas.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground" data-testid="cotizacion-mayoreo">
              {notas.join(' · ')}
            </p>
          )}
        </>
      ) : null}
    </div>
  )
}
