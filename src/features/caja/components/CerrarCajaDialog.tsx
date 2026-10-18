import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError, errorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CajaPendiente } from '@/types/api'
import { generarComprobante, MENSAJE_ERROR_COMPROBANTE } from '../comprobantePdf'
import {
  crearCierreSchema,
  diferenciaCaja,
  MAX_NOTA_CIERRE,
  parseMonto,
  sentidoDiferencia,
  textoDiferencia,
  TONO_DIFERENCIA,
  type CierreFormValues,
} from '../domain'
import { useCerrarCaja, usePendiente } from '../hooks'

/**
 * Cierre de caja: quien recibe el dinero escribe cuánto le entregan; la diferencia con lo esperado
 * se calcula en vivo (faltante en rojo, sobrante en azul) y, si no cuadra, la nota es obligatoria.
 */
export function CerrarCajaDialog({ pendiente, onClose }: { pendiente: CajaPendiente | null; onClose: () => void }) {
  // Se vuelve a pedir al abrir: el esperado debe ser el más reciente posible.
  const { data: fresco } = usePendiente(pendiente?.usuario.id ?? null)
  const esperado = fresco?.total ?? pendiente?.total ?? 0
  const cantidad = fresco?.cantidad ?? pendiente?.cantidad ?? 0
  const cerrar = useCerrarCaja()
  const schema = useMemo(() => crearCierreSchema(esperado), [esperado])
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CierreFormValues>({ resolver: zodResolver(schema), defaultValues: { monto: '', nota: '' } })

  useEffect(() => {
    if (pendiente) reset({ monto: '', nota: '' })
  }, [pendiente, reset])

  const monto = useWatch({ control, name: 'monto' })
  const entregado = parseMonto(monto ?? '')
  const diferencia = entregado === null ? null : diferenciaCaja(entregado, esperado)
  const sentido = diferencia === null ? null : sentidoDiferencia(diferencia)

  const onSubmit = async (v: CierreFormValues) => {
    if (!pendiente) return
    try {
      const cierre = await cerrar.mutateAsync({
        usuarioId: pendiente.usuario.id,
        montoEntregado: parseMonto(v.monto)!,
        ...(v.nota ? { nota: v.nota } : {}),
      })
      toast.success(`Caja de ${pendiente.usuario.nombre} cerrada`, {
        description: `${formatCurrency(cierre.entregado)} recibidos · ${textoDiferencia(cierre.diferencia)}`,
        duration: 10_000,
        action: {
          label: 'Imprimir comprobante',
          onClick: () =>
            void generarComprobante(cierre, 'imprimir').catch(() => toast.error(MENSAJE_ERROR_COMPROBANTE)),
        },
      })
      onClose()
    } catch (e) {
      if (e instanceof ApiError && e.code === 'SIN_COBROS') {
        toast.info(`${pendiente.usuario.nombre} ya no tiene cobros pendientes`)
        onClose()
      } else toast.error(errorMessage(e))
    }
  }

  return (
    <Dialog open={!!pendiente} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar caja</DialogTitle>
          <DialogDescription>
            {pendiente?.usuario.nombre} entrega el efectivo de {cantidad} {cantidad === 1 ? 'cobro' : 'cobros'}.
          </DialogDescription>
        </DialogHeader>

        <form id="cerrar-caja" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Figura: lo esperado frente a lo entregado, y la diferencia como consecuencia. */}
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Esperado</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums" data-testid="cierre-esperado">
                {formatCurrency(esperado)}
              </p>
            </div>
            <div className="text-right" aria-live="polite">
              <p className="text-xs text-muted-foreground">Diferencia</p>
              <p
                data-testid="cierre-diferencia"
                className={cn('text-lg font-semibold tabular-nums', sentido ? TONO_DIFERENCIA[sentido] : 'text-muted-foreground')}
              >
                {diferencia === null ? '—' : textoDiferencia(diferencia)}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="monto-entregado">Monto entregado</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0"
                onClick={() => setValue('monto', esperado.toFixed(2), { shouldValidate: true })}
              >
                Entrega exacta
              </Button>
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="monto-entregado"
                inputMode="decimal"
                autoComplete="off"
                placeholder={esperado.toFixed(2)}
                className="h-11 pl-7 text-lg tabular-nums"
                aria-invalid={!!errors.monto}
                {...register('monto')}
              />
            </div>
            {errors.monto && <p className="text-xs text-destructive">{errors.monto.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nota-cierre">
              Nota{' '}
              <span className="font-normal text-muted-foreground">
                {sentido && sentido !== 'cuadra' ? '(obligatoria: no cuadra)' : '(opcional)'}
              </span>
            </Label>
            <Textarea
              id="nota-cierre"
              rows={2}
              maxLength={MAX_NOTA_CIERRE}
              placeholder="Ej. faltó el vuelto de la guía 40461"
              aria-invalid={!!errors.nota}
              {...register('nota')}
            />
            {errors.nota && <p className="text-xs text-destructive">{errors.nota.message}</p>}
          </div>
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="cerrar-caja" disabled={cerrar.isPending}>
            {cerrar.isPending && <Loader2 className="animate-spin" />}
            Cerrar caja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
