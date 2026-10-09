import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/api'
import type { Ruta } from '@/types/api'
import { rutaLabel, useActualizarRuta } from '../hooks'

const schema = z.object({
  tiempoEstimadoMin: z.number({ message: 'Requerido' }).int('Minutos enteros').positive('Debe ser mayor a 0'),
})
type Values = z.infer<typeof schema>

export function EditarRutaDialog({ ruta, onClose }: { ruta: Ruta | null; onClose: () => void }) {
  const actualizar = useActualizarRuta()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (ruta) reset({ tiempoEstimadoMin: ruta.tiempoEstimadoMin })
  }, [ruta, reset])

  const onSubmit = async (values: Values) => {
    if (!ruta) return
    try {
      await actualizar.mutateAsync({ id: ruta.id, cambios: values })
      toast.success('Ruta actualizada')
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Dialog open={!!ruta} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar ruta</DialogTitle>
          <DialogDescription>{ruta && rutaLabel({ origen: ruta.origen.nombre, destino: ruta.destino.nombre })}</DialogDescription>
        </DialogHeader>
        <form id="editar-ruta" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="tiempoEstimadoMin">Tiempo estimado (min)</Label>
            <Input id="tiempoEstimadoMin" type="number" step="5" {...register('tiempoEstimadoMin', { valueAsNumber: true })} />
            {errors.tiempoEstimadoMin && <p className="text-xs text-destructive">{errors.tiempoEstimadoMin.message}</p>}
            <p className="text-xs text-muted-foreground">El precio depende del tipo de carga, no de la ruta.</p>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="editar-ruta" disabled={actualizar.isPending}>
            {actualizar.isPending && <Loader2 className="animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
