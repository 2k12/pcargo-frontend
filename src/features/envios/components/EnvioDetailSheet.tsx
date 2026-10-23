import { Bike, CalendarClock, Copy, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { BotonCopiar } from '@/components/BotonCopiar'
import { Button } from '@/components/ui/button'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime, formatPeso } from '@/lib/format'
import type { Envio, Estado, Zona } from '@/types/api'
import { adicionalDe, totalConAdicional } from '../costoAdicional'
import { esEstadoFinal, ESTADO_LABEL, nombreTipoCarga, piezasLabel, ZONA_LABEL } from '../domain'
import { fechaGuiaDe, fechaGuiaDistinta, fechaMedia } from '../fechaGuia'
import { useAsignarRepartidor, useCambiarEstado, useEnvio } from '../hooks'
import { iconoTipoCarga } from '../ui'
import { AsignarRepartidorMenu } from './AsignarRepartidorMenu'
import { CambioEstadoForm } from './CambioEstadoForm'
import { EstadoBadge } from './EstadoBadge'
import { FormaPagoBadge } from './FormaPagoBadge'
import { GuiaAcciones } from './GuiaAcciones'
import { HistorialTimeline } from './HistorialTimeline'
import { OrigenBadge } from './OrigenBadge'
import { PruebaEntrega } from './PruebaEntrega'

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
  zona,
  destino,
}: {
  ciudad: string
  rol: string
  nombre: string
  telefono: string
  direccion?: string | null
  zona?: Zona
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
        {zona && <span data-testid="zona-entrega"> · zona {ZONA_LABEL[zona].toLowerCase()}</span>}
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
  // Contrato v15: `costo` ya incluye el adicional; la tarifa es la diferencia.
  const adicional = adicionalDe(envio)
  return (
    <div className="relative overflow-x-auto rounded-lg border">
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
            const Icon = iconoTipoCarga(i.tipoCarga)
            return (
              <tr key={`${i.tipoCarga}-${idx}`} className="border-t">
                <td className="px-2 py-1.5">
                  <span className="flex items-center gap-1.5">
                    <Icon className="size-3.5 text-muted-foreground" />
                    {nombreTipoCarga(i.tipoCarga)}
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
          {adicional > 0 && (
            <>
              <tr className="font-normal text-muted-foreground" data-testid="desglose-tarifa">
                <td className="px-2 py-1.5" colSpan={4}>
                  Tarifa
                </td>
                <td className="px-2 py-1.5 text-right">{formatCurrency(totalConAdicional(envio.costo, -adicional))}</td>
              </tr>
              <tr className="font-normal text-muted-foreground" data-testid="desglose-adicional">
                <td className="px-2 py-1.5" colSpan={4}>
                  Costo adicional
                </td>
                <td className="px-2 py-1.5 text-right">{formatCurrency(adicional)}</td>
              </tr>
            </>
          )}
          <tr className={adicional > 0 ? 'border-t' : undefined}>
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

/** Repartidor asignado (contrato v12) y opción de asignar o reasignar mientras el envío no termine. */
function Repartidor({ envio }: { envio: Envio }) {
  const asignar = useAsignarRepartidor()
  const actual = envio.repartidor ?? null
  const elegir = async (repartidorId: string | null, nombre: string | null) => {
    if (repartidorId === (actual?.id ?? null)) return
    try {
      await asignar.mutateAsync({ envioIds: [envio.id], repartidorId })
      toast.success(repartidorId ? `Guía ${envio.numeroGuia} asignada a ${nombre}` : `Guía ${envio.numeroGuia} sin repartidor`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3" data-testid="repartidor">
      <div className="flex min-w-0 items-center gap-2.5">
        <Bike className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Repartidor</p>
          <p className="truncate text-sm">{actual?.nombre ?? 'Sin asignar'}</p>
          {actual && envio.asignadoEn && <p className="text-xs text-muted-foreground">Desde {formatDateTime(envio.asignadoEn)}</p>}
        </div>
      </div>
      {!esEstadoFinal(envio.estado) && (
        <AsignarRepartidorMenu
          actualId={actual?.id}
          permitirQuitar={!!actual}
          onElegir={elegir}
          trigger={<Button variant="outline" size="sm" disabled={asignar.isPending} />}
        >
          {asignar.isPending && <Loader2 className="animate-spin" />}
          {actual ? 'Reasignar' : 'Asignar'}
        </AsignarRepartidorMenu>
      )}
    </div>
  )
}

export function EnvioDetailSheet({ envioId, onClose }: { envioId: string | null; onClose: () => void }) {
  const { data: envio, isLoading } = useEnvio(envioId)
  const cambiar = useCambiarEstado(envioId ?? '')
  // Tras marcar ENTREGADO se lleva al usuario a subir la foto de la guía firmada.
  const [pedirEvidencia, setPedirEvidencia] = useState<string | null>(null)

  const transicionar = async (estado: Estado, nota: string) => {
    try {
      const actualizado = await cambiar.mutateAsync({ estado, nota })
      if (estado === 'ENTREGADO' && !actualizado.evidencia) {
        toast.success(`Guía ${actualizado.numeroGuia}: entregado`, {
          description: 'Ahora sube la foto de la guía firmada como prueba de entrega.',
        })
        setPedirEvidencia(actualizado.id)
      } else {
        toast.success(`Guía ${actualizado.numeroGuia}: ${ESTADO_LABEL[estado].toLowerCase()}`)
      }
    } catch (e) {
      toast.error(errorMessage(e))
      throw e
    }
  }

  const copiarCodigo = () => {
    if (!envio) return
    navigator.clipboard?.writeText(String(envio.numeroGuia)).then(() => toast.success('Número de guía copiado'))
  }

  return (
    <Sheet open={!!envioId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2 font-mono">
            {envio ? `Guía ${envio.numeroGuia}` : 'Envío'}
            {envio && (
              <Button variant="ghost" size="icon-xs" onClick={copiarCodigo} aria-label="Copiar número de guía">
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
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <EstadoBadge estado={envio.estado} />
                <FormaPagoBadge formaPago={envio.formaPago} />
                <OrigenBadge origen={envio.origen} />
              </div>
              <span className="shrink-0 text-right">
                <span className="block text-xl font-semibold tabular-nums">{formatCurrency(envio.costo)}</span>
                {adicionalDe(envio) > 0 && (
                  <span className="block text-xs text-muted-foreground tabular-nums">incluye {formatCurrency(adicionalDe(envio))} adicional</span>
                )}
              </span>
            </div>

            {envio.anonimizadoEn && (
              <p className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground" data-testid="anonimizado">
                <ShieldCheck className="size-3.5 shrink-0" />
                Datos personales eliminados el {formatDate(envio.anonimizadoEn)}. Se conservan guía, ruta, costos y estados.
              </p>
            )}

            {envio.referenciaExterna && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2" data-testid="referencia-externa">
                <p className="min-w-0 text-sm">
                  <span className="block text-xs text-muted-foreground">
                    Ref. pedido{envio.origen?.integracion ? ` · ${envio.origen.integracion}` : ''}
                  </span>
                  <span className="block truncate font-mono">{envio.referenciaExterna}</span>
                </p>
                <BotonCopiar valor={envio.referenciaExterna} etiqueta="Copiar referencia del pedido" />
              </div>
            )}

            <GuiaAcciones envio={envio} />

            <section className="space-y-2" aria-label="Trayecto">
              <SectionLabel>Trayecto</SectionLabel>
              <ol className="space-y-4 rounded-xl bg-muted/40 p-3">
                <Parada
                  ciudad={envio.ruta.origen}
                  rol="Remitente"
                  nombre={envio.remitente.nombre}
                  telefono={envio.remitente.telefono}
                  direccion={envio.remitente.direccion}
                />
                <Parada
                  destino
                  ciudad={envio.ruta.destino}
                  rol="Destinatario"
                  nombre={envio.destinatario.nombre}
                  telefono={envio.destinatario.telefono}
                  direccion={envio.destinatario.direccion}
                  zona={envio.zona ?? 'URBANA'}
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
              <Repartidor envio={envio} />
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-0.5 rounded-xl bg-muted/40 p-3" data-testid="registro">
                  <p className="text-xs text-muted-foreground">Registrado</p>
                  <p className="text-sm">{formatDateTime(envio.registro.fecha)}</p>
                  <p className="text-xs text-muted-foreground">{envio.registro.operador ?? 'Operador no disponible'}</p>
                  {fechaGuiaDistinta(envio) && (
                    <p className="flex items-center gap-1 pt-1 text-xs" data-testid="fecha-guia">
                      <CalendarClock aria-hidden className="size-3 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">Fecha de la guía:</span> {fechaMedia(fechaGuiaDe(envio))}
                    </p>
                  )}
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

            <PruebaEntrega key={envio.id} envio={envio} resaltar={pedirEvidencia === envio.id} />

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
