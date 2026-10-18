import { SectionLabel } from '@/components/layout/SectionLabel'
import { Skeleton } from '@/components/ui/skeleton'
import { ListaCobros } from '@/features/caja/components/ListaCobros'
import { TIPO_COBRO_LABEL } from '@/features/caja/domain'
import { errorMessage } from '@/lib/api'
import { SUPERFICIE } from '@/lib/estilos'
import { formatCurrency, formatRelativo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCajaReparto } from './hooks'

/** Lo que el repartidor lleva cobrado y debe entregar en la oficina. */
export function CajaRepartidorPage() {
  const { data: caja, isLoading, error } = useCajaReparto()

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Caja</h1>
      {error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage(error)}
        </p>
      ) : isLoading || !caja ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : (
        <>
          <div className={cn('space-y-1 p-5 text-center', SUPERFICIE)}>
            <p className="text-sm text-muted-foreground">Debes entregar</p>
            <p className="text-4xl font-semibold tracking-tight tabular-nums" data-testid="caja-total">
              {formatCurrency(caja.total)}
            </p>
            <p className="text-sm text-muted-foreground">
              {caja.cantidad} {caja.cantidad === 1 ? 'cobro' : 'cobros'}
              {caja.desde && ` · desde ${formatRelativo(caja.desde)}`}
            </p>
            {caja.porTipo.length > 0 && (
              <p className="pt-2 text-xs text-muted-foreground">
                {caja.porTipo.map((t) => `${TIPO_COBRO_LABEL[t.tipo]}: ${formatCurrency(t.monto)}`).join(' · ')}
              </p>
            )}
          </div>
          <section className="space-y-2" aria-label="Cobros por entregar">
            <SectionLabel as="h2">Cobros</SectionLabel>
            {(caja.cobros ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No llevas dinero cobrado. Todo está entregado.</p>
            ) : (
              <ListaCobros cobros={caja.cobros ?? []} className={cn('px-4', SUPERFICIE)} />
            )}
          </section>
        </>
      )}
    </>
  )
}
