import { CircleCheck, PackageOpen, RefreshCw } from 'lucide-react'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { VistaReparto } from '@/types/api'
import { EntregaCard } from './components/EntregaCard'
import { agruparPorDestino, totalPorCobrar } from './domain'
import { useEnviosReparto } from './hooks'
import { useHojasReparto } from './useHojasReparto'

const TEXTOS: Record<VistaReparto, { titulo: string; vacio: string; vacioDetalle: string }> = {
  pendientes: { titulo: 'Pendientes', vacio: 'Sin entregas pendientes', vacioDetalle: 'Cuando te asignen envíos aparecerán aquí.' },
  hoy: { titulo: 'Hoy', vacio: 'Aún no gestionas entregas hoy', vacioDetalle: 'Lo que entregues o no puedas entregar hoy queda aquí.' },
}

/** Entregas del repartidor agrupadas por destino (pendientes u hoy). */
export function EntregasPage({ vista }: { vista: VistaReparto }) {
  const { data: envios = [], isLoading, error, refetch, isFetching } = useEnviosReparto(vista)
  const hojas = useHojasReparto()
  const grupos = agruparPorDestino(envios)
  const cobrar = totalPorCobrar(envios)
  const t = TEXTOS[vista]

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.titulo}</h1>
          {!isLoading && !error && (
            <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {envios.length} {envios.length === 1 ? 'entrega' : 'entregas'}
              {cobrar > 0 && (
                <>
                  {' · '}
                  <span className="font-medium text-foreground">{formatCurrency(cobrar)} por cobrar</span>
                </>
              )}
            </p>
          )}
        </div>
        <Button variant="ghost" className="size-11" onClick={() => refetch()} disabled={isFetching} aria-label="Actualizar" title="Actualizar">
          <RefreshCw className={isFetching ? 'size-5 animate-spin' : 'size-5'} />
        </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage(error)}
        </p>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : envios.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          {vista === 'pendientes' ? (
            <CircleCheck className="size-8 text-brand-green-text" strokeWidth={1.5} />
          ) : (
            <PackageOpen className="size-8 text-muted-foreground/60" strokeWidth={1.5} />
          )}
          <p className="font-medium">{t.vacio}</p>
          <p className="text-sm text-muted-foreground">{t.vacioDetalle}</p>
        </div>
      ) : (
        grupos.map((g) => (
          <section key={g.destino} className="space-y-3" aria-label={`Destino ${g.destino}`}>
            <SectionLabel
              as="h2"
              aside={
                <span className="tabular-nums">
                  {g.envios.length}
                  {g.porCobrar > 0 && ` · ${formatCurrency(g.porCobrar)}`}
                </span>
              }
            >
              {g.destino}
            </SectionLabel>
            {g.envios.map((e) => (
              <EntregaCard key={e.id} envio={e} onEntregar={hojas.onEntregar} onMotivo={hojas.onMotivo} />
            ))}
          </section>
        ))
      )}
      {hojas.hojas}
    </>
  )
}

export const PendientesPage = () => <EntregasPage vista="pendientes" />
export const HoyPage = () => <EntregasPage vista="hoy" />
