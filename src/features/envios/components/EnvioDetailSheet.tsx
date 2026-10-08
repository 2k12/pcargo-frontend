import { Copy, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { rutaLabel } from '@/features/rutas/hooks'
import { errorMessage } from '@/lib/api'
import { formatCurrency, formatDateTime, formatPeso } from '@/lib/format'
import type { Estado } from '@/types/api'
import { ACCION_LABEL, TIPO_CARGA_LABEL, transicionesPermitidas } from '../domain'
import { useCambiarEstado, useEnvio } from '../hooks'
import { EstadoBadge } from './EstadoBadge'
import { HistorialTimeline } from './HistorialTimeline'

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

export function EnvioDetailSheet({ envioId, onClose }: { envioId: string | null; onClose: () => void }) {
  const { data: envio, isLoading } = useEnvio(envioId)
  const cambiar = useCambiarEstado(envioId ?? '')
  const [nota, setNota] = useState('')

  const transicionar = async (estado: Estado) => {
    try {
      const actualizado = await cambiar.mutateAsync({ estado, nota })
      setNota('')
      toast.success(`Envío ${actualizado.codigo}: ${ACCION_LABEL[estado].toLowerCase()}`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const copiarCodigo = () => {
    if (!envio) return
    navigator.clipboard?.writeText(envio.codigo).then(() => toast.success('Código copiado'))
  }

  const acciones = envio ? transicionesPermitidas(envio.estado) : []

  return (
    <Sheet open={!!envioId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
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
            <div className="flex items-center justify-between">
              <EstadoBadge estado={envio.estado} />
              <span className="text-lg font-semibold tabular-nums">{formatCurrency(envio.costo)}</span>
            </div>

            <dl className="grid grid-cols-2 gap-4">
              <Dato label="Ruta">{rutaLabel(envio.ruta)}</Dato>
              <Dato label="Carga">
                {TIPO_CARGA_LABEL[envio.tipoCarga]} · {formatPeso(envio.pesoKg)}
              </Dato>
              <Dato label="Remitente">
                {envio.remitente.nombre}
                <span className="block text-xs text-muted-foreground">{envio.remitente.telefono}</span>
              </Dato>
              <Dato label="Destinatario">
                {envio.destinatario.nombre}
                <span className="block text-xs text-muted-foreground">{envio.destinatario.telefono}</span>
              </Dato>
              <div className="col-span-2">
                <Dato label="Dirección de entrega">{envio.destinatario.direccion}</Dato>
              </div>
              {envio.descripcion && (
                <div className="col-span-2">
                  <Dato label="Descripción">{envio.descripcion}</Dato>
                </div>
              )}
              <Dato label="Registrado">{formatDateTime(envio.creadoEn)}</Dato>
              <Dato label="Última actualización">{formatDateTime(envio.actualizadoEn)}</Dato>
            </dl>

            {acciones.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium">Actualizar estado</p>
                  <Textarea
                    placeholder="Nota opcional (p. ej. recibido por portería)"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-2">
                    {acciones.map((estado) => (
                      <Button
                        key={estado}
                        variant={estado === 'CANCELADO' ? 'destructive' : 'default'}
                        disabled={cambiar.isPending}
                        onClick={() => transicionar(estado)}
                      >
                        {cambiar.isPending && cambiar.variables?.estado === estado && <Loader2 className="animate-spin" />}
                        {ACCION_LABEL[estado]}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

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
