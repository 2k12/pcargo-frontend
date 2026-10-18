import { SectionLabel } from '@/components/layout/SectionLabel'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ROL_LABEL } from '@/features/auth/roles'
import { errorMessage } from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { numeroCierre } from '../comprobantePdf'
import { sentidoDiferencia, textoDiferencia, TIPO_COBRO_LABEL, TONO_DIFERENCIA } from '../domain'
import { useCierre } from '../hooks'
import { ComprobanteAcciones } from './ComprobanteAcciones'
import { ListaCobros } from './ListaCobros'

export function CierreDetalleSheet({ cierreId, onClose }: { cierreId: string | null; onClose: () => void }) {
  const { data: cierre, isLoading, error } = useCierre(cierreId)

  return (
    <Sheet open={!!cierreId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="font-mono">{cierre ? `Cierre ${numeroCierre(cierre.id)}` : 'Cierre de caja'}</SheetTitle>
          <SheetDescription>{cierre ? formatDateTime(cierre.fecha) : 'Detalle del cierre'}</SheetDescription>
        </SheetHeader>
        {error ? (
          <p className="p-4 text-sm text-destructive">{errorMessage(error)}</p>
        ) : isLoading || !cierre ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="space-y-6 p-4">
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Esperado</p>
                <p className="font-semibold tabular-nums">{formatCurrency(cierre.esperado)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Entregado</p>
                <p className="font-semibold tabular-nums">{formatCurrency(cierre.entregado)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diferencia</p>
                <p className={cn('font-semibold tabular-nums', TONO_DIFERENCIA[sentidoDiferencia(cierre.diferencia)])}>
                  {textoDiferencia(cierre.diferencia)}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Entregó</dt>
                <dd>{cierre.usuario.nombre}</dd>
                <dd className="text-xs text-muted-foreground">{ROL_LABEL[cierre.usuario.rol]}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Recibió</dt>
                <dd>{cierre.recibidoPor.nombre}</dd>
              </div>
              {cierre.nota && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Nota</dt>
                  <dd>{cierre.nota}</dd>
                </div>
              )}
            </dl>

            <ComprobanteAcciones cierre={cierre} />

            {cierre.porTipo.length > 0 && (
              <section className="space-y-2" aria-label="Desglose">
                <SectionLabel>Desglose</SectionLabel>
                <ul className="space-y-1 text-sm">
                  {cierre.porTipo.map((t) => (
                    <li key={t.tipo} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">
                        {TIPO_COBRO_LABEL[t.tipo]} ({t.cantidad})
                      </span>
                      <span className="tabular-nums">{formatCurrency(t.monto)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="space-y-2" aria-label="Cobros del cierre">
              <SectionLabel aside={`${cierre.cantidad}`}>Cobros</SectionLabel>
              <ListaCobros cobros={cierre.cobros ?? []} />
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
