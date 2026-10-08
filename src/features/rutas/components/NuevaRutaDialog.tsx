import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { errorMessage } from '@/lib/api'
import { useCiudades, useCrearRuta } from '../hooks'

const schema = z.object({
  origenId: z.string().min(1, 'Selecciona el origen'),
  destinoId: z.string().min(1, 'Selecciona el destino'),
  tarifaBase: z.number({ message: 'Requerido' }).positive('Debe ser mayor a 0'),
  tiempoEstimadoMin: z.number({ message: 'Requerido' }).int().positive('Debe ser mayor a 0'),
})
type Values = z.infer<typeof schema>

export function NuevaRutaDialog() {
  const [open, setOpen] = useState(false)
  const { data: ciudades = [] } = useCiudades()
  const crear = useCrearRuta()
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { origenId: '', destinoId: '' } })

  const items = Object.fromEntries(ciudades.map((c) => [String(c.id), c.nombre]))

  const onSubmit = async (v: Values) => {
    try {
      await crear.mutateAsync({
        origenId: Number(v.origenId),
        destinoId: Number(v.destinoId),
        tarifaBase: v.tarifaBase,
        tiempoEstimadoMin: v.tiempoEstimadoMin,
      })
      toast.success('Ruta creada')
      reset()
      setOpen(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const ciudadSelect = (name: 'origenId' | 'destinoId', label: string) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select items={items} value={field.value || null} onValueChange={(v) => field.onChange(v ?? '')}>
            <SelectTrigger className="w-full" aria-label={label}>
              <SelectValue placeholder="Ciudad" />
            </SelectTrigger>
            <SelectContent>
              {ciudades.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message}</p>}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Nueva ruta
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva ruta</DialogTitle>
          <DialogDescription>Define un trayecto y su tarifa base.</DialogDescription>
        </DialogHeader>
        <form id="nueva-ruta" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4" noValidate>
          {ciudadSelect('origenId', 'Origen')}
          {ciudadSelect('destinoId', 'Destino')}
          <div className="space-y-1.5">
            <Label htmlFor="nr-tarifa">Tarifa base (USD)</Label>
            <Input id="nr-tarifa" type="number" step="0.05" {...register('tarifaBase', { valueAsNumber: true })} />
            {errors.tarifaBase && <p className="text-xs text-destructive">{errors.tarifaBase.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nr-tiempo">Tiempo (min)</Label>
            <Input id="nr-tiempo" type="number" step="5" {...register('tiempoEstimadoMin', { valueAsNumber: true })} />
            {errors.tiempoEstimadoMin && <p className="text-xs text-destructive">{errors.tiempoEstimadoMin.message}</p>}
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="nueva-ruta" disabled={crear.isPending}>
            {crear.isPending && <Loader2 className="animate-spin" />}
            Crear ruta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
