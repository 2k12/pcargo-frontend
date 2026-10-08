import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { rutaLabel } from '@/features/rutas/hooks'
import { errorMessage } from '@/lib/api'
import { formatCurrency, formatDateTime, formatPeso } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Envio, Estado } from '@/types/api'
import { ESTADO_LABEL, TIPO_CARGA_LABEL } from '../domain'
import { useCambiarEstado, useEnvio } from '../hooks'
import { ESTADO_TONO, TIPO_CARGA_ICON } from '../ui'
import { CambioEstadoForm } from './CambioEstadoForm'
import { EstadoBadge } from './EstadoBadge'
import { FormaPagoBadge } from './FormaPagoBadge'
import { HistorialTimeline } from './HistorialTimeline'

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

function ItemsTabla({ envio }: { envio: Envio }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs tabular-nums" aria-label="Ítems del envío">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium">Tipo</th>
            <th className="px-2 py-1.5 text-right font-medium">Cant.</th>
            <th className="px-2 py-1.5 text-right font-medium">Peso/u</th>
            <th className="px-2 py-1.5 text-right font-medium">Costo/u</th>
            <th className="px-2 py-1.5 text-right font-medium">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {envio.items.map((i, idx) => {
            const Icon = TIPO_CARGA_ICON[i.tipoCarga]
            return (
              <tr key={`${i.tipoCarga}-${idx}`} className="border-t">
                <td className="px-2 py-1.5">
                  <span className="flex items-center gap-1.5">
                    <Icon className="size-3.5 text-muted-foreground" />
                    {TIPO_CARGA_LABEL[i.tipoCarga]}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right">{i.cantidad}</td>
                <td className="px-2 py-1.5 text-right">{formatPeso(i.pesoKg)}</td>
                <td className="px-2 py-1.5 text-right">{formatCurrency(i.costoUnitario)}</td>
                <td className="px-2 py-1.5 text-right">{formatCurrency(i.subtotal)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className="border-t bg-muted/20 font-medium">
          <tr>
            <td className="px-2 py-1.5">Total</td>
            <td className="px-2 py-1.5 text-right">{envio.totalPiezas}</td>
            <td className="px-2 py-1.5 text-right">{formatPeso(envio.pesoTotalKg)}</td>
            <td />
            <td className="px-2 py-1.5 text-right">{formatCurrency(envio.costo)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export function EnvioDetailSheet({ envioId, onClose }: { envioId: string | null; onClose: () => void }) {
  const { data: envio, isLoading } = useEnvio(envioId)
  const cambiar = useCambiarEstado(envioId ?? '')

  const transicionar = async (estado: Estado, nota: string) => {
    try {
      const actualizado = await cambiar.mutateAsync({ estado, nota })
      toast.success(`Envío ${actualizado.codigo}: ${ESTADO_LABEL[estado].toLowerCase()}`)
    } catch (e) {
      toast.error(errorMessage(e))
      throw e
    }
  }

  const copiarCodigo = () => {
    if (!envio) return
    navigator.clipboard?.writeText(envio.codigo).then(() => toast.success('Código copiado'))
  }

  return (
    <Sheet open={!!envioId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2 font-mono">
            {envio?.codigo ?? 'Envío'}
            {envio && (
              <Button variant="ghost" size="icon-xs" onClick={copiarCodigo} aria-label="Copiar código">
                <Copy />
              </Button>
            )}
          </SheetTitle>
          <SheetDescription>Detalle y seguimiento de la encomienda</SheetDescription>
        </SheetHeader>

        {isLoading || !envio ? (
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
              <span className="text-lg font-semibold tabular-nums">{formatCurrency(envio.costo)}</span>
            </div>

            <ItemsTabla envio={envio} />

            <dl className="grid grid-cols-2 gap-4">
              <Dato label="Ruta">{rutaLabel(envio.ruta)}</Dato>
              <Dato label="Remitente">
                {envio.remitente.nombre}
                <span className="block text-xs text-muted-foreground">{envio.remitente.telefono}</span>
              </Dato>
              <Dato label="Destinatario">
                {envio.destinatario.nombre}
                <span className="block text-xs text-muted-foreground">{envio.destinatario.telefono}</span>
              </Dato>
              <Dato label="Dirección de entrega">{envio.destinatario.direccion}</Dato>
              {envio.descripcion && (
                <div className="col-span-2">
                  <Dato label="Descripción">{envio.descripcion}</Dato>
                </div>
              )}
            </dl>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-3" data-testid="registro">
                <p className="text-xs text-muted-foreground">Registrado</p>
                <p className="text-sm">{formatDateTime(envio.registro.fecha)}</p>
                <p className="text-xs text-muted-foreground">{envio.registro.operador ?? 'Operador no disponible'}</p>
              </div>
              <div className="rounded-lg border p-3" data-testid="gestion-entrega">
                <p className="text-xs text-muted-foreground">Última gestión de entrega</p>
                {envio.entrega ? (
                  <>
                    <span
                      className={cn(
                        'my-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
                        ESTADO_TONO[envio.entrega.resultado],
                      )}
                    >
                      {ESTADO_LABEL[envio.entrega.resultado]}
                    </span>
                    <p className="text-sm">{formatDateTime(envio.entrega.fecha)}</p>
                    <p className="text-xs text-muted-foreground">{envio.entrega.operador ?? 'Operador no disponible'}</p>
                    {envio.entrega.nota && <p className="mt-1 text-xs">{envio.entrega.nota}</p>}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin intentos de entrega</p>
                )}
              </div>
            </div>

            {/* key: reinicia el formulario (nota/motivo) al cambiar de envío o de estado */}
            <CambioEstadoForm
              key={`${envio.id}-${envio.estado}`}
              estado={envio.estado}
              pendiente={cambiar.isPending ? (cambiar.variables?.estado ?? null) : null}
              onTransicion={transicionar}
            />

            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-medium">Historial</p>
              <HistorialTimeline eventos={envio.historial ?? []} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
