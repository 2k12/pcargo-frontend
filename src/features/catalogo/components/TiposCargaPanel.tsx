import { Info, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { iconoTipoCarga } from '@/features/envios/ui'
import { Confirmar } from '@/features/integraciones/components/Confirmar'
import { ApiError, errorMessage } from '@/lib/api'
import { SUPERFICIE } from '@/lib/estilos'
import { formatCurrency, formatPeso } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { TipoCarga } from '@/types/api'
import { mayoreoCorto, mover } from '../domain'
import { useActualizarTipoCarga, useEliminarTipoCarga, useOrdenarTipos, useTiposCargaTodos } from '../hooks'
import { BotonesOrden } from './BotonesOrden'
import { TipoCargaFormDialog } from './TipoCargaFormDialog'

export const AVISO_PRECIOS = 'Los envíos ya registrados conservan su precio; los cambios aplican a cotizaciones y envíos nuevos.'

/** Mensaje del 409 al eliminar: el tipo ya se usó en envíos (o es el último activo). */
function mensajeEliminar(e: unknown, tipo: TipoCarga): string {
  if (e instanceof ApiError && e.status === 409) {
    return /activo/i.test(e.message) && !/env[ií]o/i.test(e.message)
      ? e.message
      : `«${tipo.nombre}» tiene envíos: desactívalo en lugar de eliminarlo.`
  }
  return errorMessage(e)
}

function Dato({ etiqueta, children, tenue = false }: { etiqueta: string; children: React.ReactNode; tenue?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className={cn('truncate tabular-nums', tenue && 'text-muted-foreground')}>{children}</dd>
    </div>
  )
}

/** Pestaña «Tipos de carga»: precios, mayoreo, peso máximo, activo y orden (contrato v11). */
export function TiposCargaPanel() {
  const { data: tipos, isLoading, error } = useTiposCargaTodos()
  const actualizar = useActualizarTipoCarga()
  const eliminar = useEliminarTipoCarga()
  const ordenar = useOrdenarTipos()
  const [formulario, setFormulario] = useState<{ abierto: boolean; tipo: TipoCarga | null }>({ abierto: false, tipo: null })
  const [desactivando, setDesactivando] = useState<TipoCarga | null>(null)
  const [borrando, setBorrando] = useState<TipoCarga | null>(null)
  const [anuncio, setAnuncio] = useState('')

  const cambiarActivo = (t: TipoCarga, activo: boolean) =>
    actualizar.mutate(
      { codigo: t.codigo, cambios: { activo } },
      {
        onSuccess: () => {
          toast.success(activo ? `«${t.nombre}» activado` : `«${t.nombre}» desactivado`)
          setDesactivando(null)
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    )

  const moverTipo = (i: number, delta: -1 | 1) => {
    if (!tipos) return
    const nueva = mover(tipos, i, delta)
    if (nueva === tipos) return
    const t = tipos[i]!
    setAnuncio(`${t.nombre}: posición ${i + delta + 1} de ${tipos.length}`)
    ordenar.mutate(
      nueva.map((x) => x.codigo),
      { onError: (e) => toast.error(errorMessage(e)) },
    )
  }

  const confirmarBorrado = () => {
    const t = borrando
    if (!t) return
    eliminar.mutate(t.codigo, {
      onSuccess: () => {
        toast.success(`«${t.nombre}» eliminado`)
        setBorrando(null)
      },
      onError: (e) => {
        toast.error(mensajeEliminar(e, t))
        setBorrando(null)
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="flex max-w-2xl items-start gap-2 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground" role="note">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {AVISO_PRECIOS}
        </p>
        <Button onClick={() => setFormulario({ abierto: true, tipo: null })}>
          <Plus />
          Nuevo tipo
        </Button>
      </div>

      <p className="sr-only" aria-live="polite">
        {anuncio}
      </p>

      {error ? (
        <Card>
          <p className="px-4 text-sm text-destructive">{errorMessage(error)}</p>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !tipos || tipos.length === 0 ? (
        <Card className="items-center gap-2 py-12 text-center">
          <p className="text-sm font-medium">Aún no hay tipos de carga</p>
          <p className="text-sm text-muted-foreground">Crea el primero para poder cotizar y registrar envíos.</p>
        </Card>
      ) : (
        <ul className="space-y-2" aria-label="Tipos de carga">
          {tipos.map((t, i) => {
            const Icon = iconoTipoCarga(t.codigo)
            return (
              <li key={t.codigo} className={cn(SUPERFICIE, 'flex gap-2 p-3 sm:gap-3 sm:p-4')} aria-label={t.nombre}>
                <BotonesOrden nombre={t.nombre} indice={i} total={tipos.length} onMover={(d) => moverTipo(i, d)} />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn('rounded-lg bg-accent p-2 text-accent-foreground', !t.activo && 'opacity-50')}>
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className={cn('truncate font-medium', !t.activo && 'text-muted-foreground')}>{t.nombre}</p>
                        <p className="font-mono text-xs text-muted-foreground">{t.codigo}</p>
                      </div>
                      {!t.activo && <Badge variant="outline">Inactivo</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={t.activo}
                        aria-label={`${t.activo ? 'Desactivar' : 'Activar'} ${t.nombre}`}
                        onCheckedChange={(v) => (v ? cambiarActivo(t, true) : setDesactivando(t))}
                        className="mr-2"
                      />
                      <Button variant="ghost" size="icon-sm" aria-label={`Editar ${t.nombre}`} onClick={() => setFormulario({ abierto: true, tipo: t })}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${t.nombre}`} onClick={() => setBorrando(t)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                    <Dato etiqueta="Urbano">{formatCurrency(t.precio)}</Dato>
                    <Dato etiqueta="Rural" tenue={t.precioRural === null}>
                      {t.precioRural === null ? 'Igual al urbano' : formatCurrency(t.precioRural)}
                    </Dato>
                    <Dato etiqueta="Mayoreo" tenue={!t.mayoreo}>
                      {mayoreoCorto(t.mayoreo)}
                    </Dato>
                    <Dato etiqueta="Peso máximo">{formatPeso(t.pesoMaxKg)}</Dato>
                  </dl>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <TipoCargaFormDialog
        open={formulario.abierto}
        tipo={formulario.tipo}
        onOpenChange={(abierto) => setFormulario((f) => ({ ...f, abierto }))}
      />
      <Confirmar
        abierto={!!desactivando}
        onCancelar={() => setDesactivando(null)}
        onConfirmar={() => desactivando && cambiarActivo(desactivando, false)}
        titulo={`¿Desactivar «${desactivando?.nombre ?? ''}»?`}
        descripcion="Dejará de ofrecerse en el panel, la landing, el cotizador y la API de empresas. Los envíos ya registrados no cambian y puedes volver a activarlo cuando quieras."
        accion="Desactivar"
        pendiente={actualizar.isPending}
      />
      <Confirmar
        abierto={!!borrando}
        onCancelar={() => setBorrando(null)}
        onConfirmar={confirmarBorrado}
        titulo={`¿Eliminar «${borrando?.nombre ?? ''}»?`}
        descripcion="Solo se puede eliminar un tipo que nunca se usó en un envío; si ya tiene envíos, desactívalo. Esta acción no se puede deshacer."
        accion="Eliminar"
        pendiente={eliminar.isPending}
      />
    </div>
  )
}
