import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/api'
import { formatCurrency, formatDateTime, formatPeso } from '@/lib/format'
import type { Envio, Estado } from '@/types/api'
import { ESTADO_LABEL, piezasLabel, TIPO_CARGA_LABEL } from '../domain'
import { useCambiarEstado, useEnvio } from '../hooks'
import { TIPO_CARGA_ICON } from '../ui'
import { CambioEstadoForm } from './CambioEstadoForm'
import { EstadoBadge } from './EstadoBadge'
import { FormaPagoBadge } from './FormaPagoBadge'
import { HistorialTimeline } from './HistorialTimeline'

/**
 * Un extremo del trayecto. Las dos paradas se unen con una línea vertical (continuidad):
 * se leen como un solo recorrido de origen a destino.
 */
function Parada({
  ciudad,
  rol,
  nombre,
  telefono,
  direccion,
  destino,
}: {
  ciudad: string
  rol: string
  nombre: string
  telefono: string
  direccion?: string
  destino?: boolean
}) {
  return (
    <li className="relative pl-6">
      {!destino && <span aria-hidden className="absolute top-4 -bottom-4 left-[5.5px] w-px bg-primary/40" />}
      <span
        aria-hidden
        className={
          destino
            ? 'absolute top-1 left-0 size-3 rounded-full bg-primary'
            : 'absolute top-1 left-0 size-3 rounded-full border-2 border-primary bg-card'
        }
      />
      <p className="text-xs text-muted-foreground">
        {rol} · <span className="font-medium text-foreground">{ciudad}</span>
      </p>
      <p className="text-sm font-medium">{nombre}</p>
      <p className="text-xs text-muted-foreground">
        <a href={`tel:${telefono}`} className="hover:text-foreground">
          {telefono}
        </a>
        {direccion && ` · ${direccion}`}
      </p>
    </li>
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
            {/* Figura principal: estado, pago y monto juntos */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <EstadoBadge estado={envio.estado} />
                <FormaPagoBadge formaPago={envio.formaPago} />
              </div>
              <span className="text-xl font-semibold tabular-nums">{formatCurrency(envio.costo)}</span>
            </div>

            <section className="space-y-2" aria-label="Trayecto">
              <SectionLabel>Trayecto</SectionLabel>
              <ol className="space-y-4 rounded-xl bg-muted/40 p-3">
                <Parada
                  ciudad={envio.ruta.origen}
                  rol="Remitente"
                  nombre={envio.remitente.nombre}
                  telefono={envio.remitente.telefono}
                />
                <Parada
                  destino
                  ciudad={envio.ruta.destino}
                  rol="Destinatario"
                  nombre={envio.destinatario.nombre}
                  telefono={envio.destinatario.telefono}
                  direccion={envio.destinatario.direccion}
                />
              </ol>
            </section>

            <section className="space-y-2" aria-label="Carga">
              <SectionLabel aside={`${piezasLabel(envio.totalPiezas)} · ${formatPeso(envio.pesoTotalKg)}`}>Carga</SectionLabel>
              <ItemsTabla envio={envio} />
              {envio.descripcion && <p className="text-sm text-muted-foreground">{envio.descripcion}</p>}
            </section>

            <section className="space-y-2" aria-label="Gestión">
              <SectionLabel>Gestión</SectionLabel>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-0.5 rounded-xl bg-muted/40 p-3" data-testid="registro">
                  <p className="text-xs text-muted-foreground">Registrado</p>
                  <p className="text-sm">{formatDateTime(envio.registro.fecha)}</p>
                  <p className="text-xs text-muted-foreground">{envio.registro.operador ?? 'Operador no disponible'}</p>
                </div>
                <div className="space-y-0.5 rounded-xl bg-muted/40 p-3" data-testid="gestion-entrega">
                  <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    Última entrega
                    {envio.entrega && <EstadoBadge estado={envio.entrega.resultado} />}
                  </p>
                  {envio.entrega ? (
                    <>
                      <p className="text-sm">{formatDateTime(envio.entrega.fecha)}</p>
                      <p className="text-xs text-muted-foreground">{envio.entrega.operador ?? 'Operador no disponible'}</p>
                      {envio.entrega.nota && <p className="pt-1 text-xs">{envio.entrega.nota}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin intentos de entrega</p>
                  )}
                </div>
              </div>
            </section>

            {/* key: reinicia el formulario (nota/motivo) al cambiar de envío o de estado */}
            <CambioEstadoForm
              key={`${envio.id}-${envio.estado}`}
              estado={envio.estado}
              pendiente={cambiar.isPending ? (cambiar.variables?.estado ?? null) : null}
              onTransicion={transicionar}
            />

            <section className="space-y-3" aria-label="Historial">
              <SectionLabel>Historial</SectionLabel>
              <HistorialTimeline eventos={envio.historial ?? []} />
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
