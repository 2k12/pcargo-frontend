import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Ciudad, Ruta } from '@/types/api'
import { contarRutasPorCiudad } from '../domain'
import { useActualizarCiudad, useCiudades, useCrearCiudad, useEliminarCiudad } from '../hooks'
import { NuevaRutaDialog } from './NuevaRutaDialog'

const nombreSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(60, 'Máximo 60 caracteres'),
})
type NombreValues = z.infer<typeof nombreSchema>

function NombreCiudadDialog({
  open,
  titulo,
  descripcion,
  inicial,
  accion,
  pendiente,
  onClose,
  onSubmit,
}: {
  open: boolean
  titulo: string
  descripcion: string
  inicial: string
  accion: string
  pendiente: boolean
  onClose: () => void
  onSubmit: (nombre: string) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NombreValues>({ resolver: zodResolver(nombreSchema), defaultValues: { nombre: inicial } })

  useEffect(() => {
    if (open) reset({ nombre: inicial })
  }, [open, inicial, reset])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <form id="form-ciudad" onSubmit={handleSubmit((v) => onSubmit(v.nombre))} className="space-y-1.5" noValidate>
          <Label htmlFor="ciudad-nombre">Nombre de la ciudad</Label>
          <Input id="ciudad-nombre" placeholder="Ej. Cotacachi" autoComplete="off" {...register('nombre')} />
          {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-ciudad" disabled={pendiente}>
            {pendiente && <Loader2 className="animate-spin" />}
            {accion}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CiudadesCobertura({ rutas, esAdmin }: { rutas: Ruta[]; esAdmin: boolean }) {
  const { data: ciudades, isLoading, error } = useCiudades()
  const crear = useCrearCiudad()
  const actualizar = useActualizarCiudad()
  const eliminar = useEliminarCiudad()

  const [creando, setCreando] = useState(false)
  const [renombrando, setRenombrando] = useState<Ciudad | null>(null)
  const [borrando, setBorrando] = useState<Ciudad | null>(null)
  const [rutaPara, setRutaPara] = useState<Ciudad | null>(null)

  const conteo = contarRutasPorCiudad(rutas)
  const ordenadas = [...(ciudades ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  const activas = ordenadas.filter((c) => c.activa).length

  const onCrear = async (nombre: string) => {
    try {
      const ciudad = await crear.mutateAsync(nombre)
      setCreando(false)
      toast.success(`${ciudad.nombre} agregada a la cobertura`, {
        description: 'Crea sus rutas y tarifas para empezar a recibir envíos.',
        action: { label: 'Crear ruta', onClick: () => setRutaPara(ciudad) },
      })
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const onRenombrar = async (nombre: string) => {
    if (!renombrando) return
    try {
      await actualizar.mutateAsync({ id: renombrando.id, cambios: { nombre } })
      toast.success('Ciudad actualizada')
      setRenombrando(null)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const onToggle = (c: Ciudad, activa: boolean) =>
    actualizar.mutate(
      { id: c.id, cambios: { activa } },
      {
        onSuccess: () =>
          toast.success(
            activa ? `${c.nombre} activada` : `${c.nombre} desactivada`,
            activa ? undefined : { description: 'Sus rutas dejan de ofrecerse para nuevos envíos.' },
          ),
        onError: (e) => toast.error(errorMessage(e)),
      },
    )

  const onEliminar = async () => {
    if (!borrando) return
    try {
      await eliminar.mutateAsync(borrando.id)
      toast.success(`${borrando.nombre} eliminada`)
    } catch (e) {
      // 409: la ciudad tiene rutas; el backend sugiere desactivarla.
      toast.error(errorMessage(e))
    } finally {
      setBorrando(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Ciudades de cobertura</CardTitle>
          <CardDescription>
            {ciudades ? `${activas} activa${activas === 1 ? '' : 's'} de ${ordenadas.length}` : 'Ciudades donde operamos'}
          </CardDescription>
        </div>
        {esAdmin && (
          <Button size="sm" onClick={() => setCreando(true)}>
            <Plus />
            Agregar ciudad
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">{errorMessage(error)}</p>
        ) : isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : ordenadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay ciudades de cobertura.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Ciudades de cobertura">
            {ordenadas.map((c) => {
              const n = conteo.get(c.id) ?? 0
              return (
                <li
                  key={c.id}
                  className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5', !c.activa && 'bg-muted/40')}
                >
                  <MapPin className={cn('size-4 shrink-0', c.activa ? 'text-brand-blue-text' : 'text-muted-foreground')} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm font-medium', !c.activa && 'text-muted-foreground')}>{c.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {n} ruta{n === 1 ? '' : 's'}
                    </p>
                  </div>
                  {esAdmin ? (
                    <div className="flex items-center gap-0.5">
                      <Switch
                        checked={c.activa}
                        onCheckedChange={(v) => onToggle(c, v)}
                        aria-label={`${c.activa ? 'Desactivar' : 'Activar'} ${c.nombre}`}
                        className="mr-1"
                      />
                      <Button variant="ghost" size="icon-sm" aria-label={`Renombrar ${c.nombre}`} onClick={() => setRenombrando(c)}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${c.nombre}`} onClick={() => setBorrando(c)}>
                        <Trash2 />
                      </Button>
                    </div>
                  ) : (
                    <Badge variant={c.activa ? 'secondary' : 'outline'}>{c.activa ? 'Activa' : 'Inactiva'}</Badge>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      {esAdmin && (
        <>
          <NombreCiudadDialog
            open={creando}
            titulo="Agregar ciudad"
            descripcion="La ciudad quedará activa. Luego define sus rutas y tarifas."
            inicial=""
            accion="Agregar"
            pendiente={crear.isPending}
            onClose={() => setCreando(false)}
            onSubmit={onCrear}
          />
          <NombreCiudadDialog
            open={!!renombrando}
            titulo="Renombrar ciudad"
            descripcion="El nuevo nombre se verá en rutas, envíos y en la web pública."
            inicial={renombrando?.nombre ?? ''}
            accion="Guardar"
            pendiente={actualizar.isPending}
            onClose={() => setRenombrando(null)}
            onSubmit={onRenombrar}
          />
          <Dialog open={!!borrando} onOpenChange={(o) => !o && setBorrando(null)}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>¿Eliminar {borrando?.nombre}?</DialogTitle>
                <DialogDescription>
                  Solo se pueden eliminar ciudades sin rutas. Si ya tiene rutas o envíos, desactívala para conservar el
                  historial.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBorrando(null)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={onEliminar} disabled={eliminar.isPending}>
                  {eliminar.isPending && <Loader2 className="animate-spin" />}
                  Eliminar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <NuevaRutaDialog
            open={!!rutaPara}
            onOpenChange={(o) => !o && setRutaPara(null)}
            origenId={rutaPara?.id}
          />
        </>
      )}
    </Card>
  )
}
