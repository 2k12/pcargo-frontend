import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/api'
import { SUPERFICIE } from '@/lib/estilos'
import { cn } from '@/lib/utils'
import { MESES_DEFECTO, MESES_MAX, MESES_MIN, plazoTexto, politicaSchema } from '../domain'
import { useGuardarPolitica, usePoliticaDatos } from '../hooks'

/** Plazo de conservación declarado (contrato v13). Solo se guarda el dato: el sistema no borra nada por su cuenta. */
export function PoliticaConservacion() {
  const { data: politica, isLoading, error } = usePoliticaDatos()
  const guardar = useGuardarPolitica()
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
      toast.success(`Plazo declarado: ${plazoTexto(mesesRetencion)}`)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  if (error) return <p className="text-sm text-destructive">{errorMessage(error)}</p>
  if (isLoading || !politica) return <Skeleton className="h-36 rounded-xl" />

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

      <p className="bg-card p-4 text-sm text-muted-foreground md:border-l" data-testid="aviso-conservacion">
        Es el plazo que PCargo declara en su política de privacidad. El sistema{' '}
        <span className="font-medium text-foreground">no borra datos automáticamente</span>: solo se eliminan cuando el titular
        lo solicita.
      </p>
    </div>
  )
}
