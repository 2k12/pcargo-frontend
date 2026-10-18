import { zodResolver } from '@hookform/resolvers/zod'
import { Eraser, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Confirmar } from '@/features/integraciones/components/Confirmar'
import { errorMessage } from '@/lib/api'
import { SUPERFICIE } from '@/lib/estilos'
import { formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ResultadoDepuracion } from '@/types/api'
import { contar, MESES_DEFECTO, MESES_MAX, MESES_MIN, plazoTexto, politicaSchema, resumenDepuracion, sinNadaQueDepurar } from '../domain'
import { useDepurar, useGuardarPolitica, usePoliticaDatos } from '../hooks'

/** Plazo de conservación, última depuración, lo pendiente y la depuración manual (simular → confirmar → ejecutar). */
export function PoliticaConservacion() {
  const { data: politica, isLoading, error } = usePoliticaDatos()
  const guardar = useGuardarPolitica()
  const depurar = useDepurar()
  const [simulacion, setSimulacion] = useState<ResultadoDepuracion | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<{ mesesRetencion: number }>({
    resolver: zodResolver(politicaSchema),
    defaultValues: { mesesRetencion: MESES_DEFECTO },
  })

  useEffect(() => {
    if (politica) reset({ mesesRetencion: politica.mesesRetencion })
  }, [politica, reset])

  const onGuardar = async ({ mesesRetencion }: { mesesRetencion: number }) => {
    try {
      await guardar.mutateAsync(mesesRetencion)
      toast.success(`Los datos se conservarán ${plazoTexto(mesesRetencion)}`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const simular = async () => {
    try {
      setSimulacion(await depurar.mutateAsync(true))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const ejecutar = async () => {
    try {
      const r = await depurar.mutateAsync(false)
      toast.success('Depuración completada', { description: resumenDepuracion(r).join(' · ') })
      setSimulacion(null)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  if (error) return <p className="text-sm text-destructive">{errorMessage(error)}</p>
  if (isLoading || !politica) return <Skeleton className="h-44 rounded-xl" />

  const { ultimaDepuracion: ultima, pendientes } = politica
  const nada = simulacion ? sinNadaQueDepurar(simulacion) : false

  return (
    <div className={cn('grid gap-px overflow-hidden md:grid-cols-2', SUPERFICIE)}>
      <form onSubmit={handleSubmit(onGuardar)} noValidate className="space-y-3 bg-card p-4" aria-label="Política de conservación">
        <div className="space-y-1">
          <Label htmlFor="meses-retencion">Plazo de conservación</Label>
          <p className="text-xs text-muted-foreground">
            Meses desde que el envío se entregó o se canceló. Entre {MESES_MIN} y {MESES_MAX}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            id="meses-retencion"
            type="number"
            inputMode="numeric"
            min={MESES_MIN}
            max={MESES_MAX}
            step={1}
            className="w-24 tabular-nums"
            aria-invalid={!!errors.mesesRetencion}
            {...register('mesesRetencion', { valueAsNumber: true })}
          />
          <span className="text-sm text-muted-foreground">meses</span>
          <Button type="submit" size="sm" variant="outline" className="ml-auto" disabled={!isDirty || guardar.isPending}>
            {guardar.isPending && <Loader2 className="animate-spin" />}
            Guardar
          </Button>
        </div>
        {errors.mesesRetencion ? (
          <p className="text-xs text-destructive">{errors.mesesRetencion.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Hoy: {plazoTexto(politica.mesesRetencion)}.</p>
        )}
      </form>

      <div className="flex flex-col gap-3 bg-card p-4 md:border-l">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Última depuración</dt>
            <dd>{ultima ? formatDateTime(ultima.fecha) : 'Aún no se ejecuta'}</dd>
            {ultima && (
              <dd className="text-xs text-muted-foreground">
                {contar(ultima.envios, 'envío', 'envíos')} · {contar(ultima.clientes, 'cliente', 'clientes')}
              </dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Pendiente</dt>
            <dd className="tabular-nums" data-testid="pendiente-depurar">
              {contar(pendientes.envios, 'envío', 'envíos')} · {contar(pendientes.clientes, 'cliente', 'clientes')}
            </dd>
            <dd className="text-xs text-muted-foreground">Se depura solo una vez al día</dd>
          </div>
        </dl>
        <Button variant="outline" size="sm" className="mt-auto self-start" disabled={depurar.isPending} onClick={simular}>
          {depurar.isPending && !simulacion ? <Loader2 className="animate-spin" /> : <Eraser />}
          Depurar ahora
        </Button>
      </div>

      <Confirmar
        abierto={!!simulacion}
        onCancelar={() => setSimulacion(null)}
        onConfirmar={nada ? () => setSimulacion(null) : ejecutar}
        titulo={nada ? 'No hay nada que depurar' : '¿Depurar ahora?'}
        descripcion={
          simulacion && (
            <span className="block space-y-2">
              <span className="block">
                Datos terminados antes del {formatDate(simulacion.fechaCorte)}.{' '}
                {nada ? 'Todo está dentro del plazo.' : 'Esto no se puede deshacer:'}
              </span>
              {!nada && (
                <span className="block space-y-0.5 text-foreground" data-testid="simulacion-depuracion">
                  {resumenDepuracion(simulacion).map((t) => (
                    <span key={t} className="block">
                      · {t}
                    </span>
                  ))}
                </span>
              )}
            </span>
          )
        }
        accion={nada ? 'Entendido' : 'Depurar'}
        destructiva={!nada}
        pendiente={depurar.isPending}
      />
    </div>
  )
}
