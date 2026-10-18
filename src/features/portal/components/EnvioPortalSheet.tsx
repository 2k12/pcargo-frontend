import { CircleCheck } from 'lucide-react'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { EstadoBadge } from '@/features/envios/components/EstadoBadge'
import { FormaPagoBadge } from '@/features/envios/components/FormaPagoBadge'
import { GuiaAcciones } from '@/features/envios/components/GuiaAcciones'
import { HistorialTimeline } from '@/features/envios/components/HistorialTimeline'
import { piezasLabel, resumenItems, ZONA_LABEL } from '@/features/envios/domain'
import { errorMessage } from '@/lib/api'
import { formatCurrency, formatDateTime, formatPeso } from '@/lib/format'
import { envioDesdePortal } from '../domain'
import { useClientePortal, useEnvioPortal } from '../hooks'

/** Detalle de un envío del portal: estado, destino, carga, quién recibió, historial y guía imprimible. */
export function EnvioPortalSheet({ envioId, onClose }: { envioId: string | null; onClose: () => void }) {
  const { data: envio, isLoading, error } = useEnvioPortal(envioId)
  const cliente = useClientePortal()

  return (
    <Sheet open={!!envioId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle className="font-mono">{envio ? `Guía ${envio.numeroGuia}` : 'Envío'}</SheetTitle>
          <SheetDescription>{envio ? `Registrado el ${formatDateTime(envio.creadoEn)}` : 'Detalle del envío'}</SheetDescription>
        </SheetHeader>
        {error ? (
          <p className="p-4 text-sm text-destructive">{errorMessage(error)}</p>
        ) : isLoading || !envio ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="space-y-6 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <EstadoBadge estado={envio.estado} />
                <FormaPagoBadge formaPago={envio.formaPago} />
              </div>
              <span className="text-xl font-semibold tabular-nums">{formatCurrency(envio.costo)}</span>
            </div>

            {envio.evidencia && (
              <p className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm" data-testid="recibido-por">
                <CircleCheck className="size-4 shrink-0 text-brand-green-text" />
                Recibió <strong className="font-medium">{envio.evidencia.recibidoPor}</strong>
                <span className="text-xs text-muted-foreground">· {formatDateTime(envio.evidencia.subidaEn)}</span>
              </p>
            )}

            {cliente && <GuiaAcciones envio={envioDesdePortal(envio, cliente)} />}

            <section className="space-y-2" aria-label="Destino">
              <SectionLabel>Destino</SectionLabel>
              <div className="rounded-xl bg-muted/40 p-3 text-sm">
                <p className="font-medium">{envio.destinatario.nombre}</p>
                <p className="text-muted-foreground">
                  {envio.destinatario.direccion} · {envio.ruta.destino} (zona {ZONA_LABEL[envio.zona].toLowerCase()})
                </p>
                <p className="text-muted-foreground">{envio.destinatario.telefono}</p>
              </div>
            </section>

            <section className="space-y-2" aria-label="Carga">
              <SectionLabel aside={`${piezasLabel(envio.totalPiezas)} · ${formatPeso(envio.pesoTotalKg)}`}>Carga</SectionLabel>
              <p className="text-sm">{resumenItems(envio.items)}</p>
              {envio.descripcion && <p className="text-sm text-muted-foreground">{envio.descripcion}</p>}
              {envio.referenciaExterna && <p className="text-xs text-muted-foreground">Ref. pedido: {envio.referenciaExterna}</p>}
            </section>

            <section className="space-y-3" aria-label="Historial">
              <SectionLabel>Historial</SectionLabel>
              <HistorialTimeline eventos={(envio.historial ?? []).map((h) => ({ ...h, usuario: null }))} />
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
