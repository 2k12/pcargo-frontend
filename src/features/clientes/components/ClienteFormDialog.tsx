import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MENSAJE_CONSENTIMIENTO } from '@/features/envios/schema'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { Cliente } from '@/types/api'
import { useActualizarCliente, useCrearCliente } from '../api'
import { ConsentimientoDatos } from './ConsentimientoDatos'

const clienteSchema = z.object({
  nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(120, 'Máximo 120 caracteres'),
  telefono: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,15}$/, 'Teléfono inválido'),
  direccion: z.string().trim().max(300).optional(),
  notas: z.string().trim().max(300).optional(),
  consentimiento: z.boolean(),
  /** Alta (true) o edición: solo el alta exige el consentimiento. */
  esAlta: z.boolean(),
})
type ClienteValues = z.infer<typeof clienteSchema>

// LOPDP: el alta exige el consentimiento expreso del cliente; en la edición es opcional (registra el de clientes antiguos).
const esquema = clienteSchema.refine((v) => !v.esAlta || v.consentimiento, {
  path: ['consentimiento'],
  message: MENSAJE_CONSENTIMIENTO,
})

const VACIO: ClienteValues = { nombre: '', telefono: '', direccion: '', notas: '', consentimiento: false, esAlta: true }

/**
 * Alta o edición de un cliente. Solo nombre y teléfono son obligatorios para que registrar
 * a alguien tome segundos; dirección y notas se pueden completar después.
 */
export function ClienteFormDialog({
  open,
  onOpenChange,
  cliente,
  inicial,
  onGuardado,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si se indica, edita ese cliente. */
  cliente?: Cliente | null
  /** Valores con que empieza un alta (p. ej. lo escrito en el buscador). */
  inicial?: Partial<ClienteValues>
  onGuardado?: (cliente: Cliente) => void
}) {
  const crear = useCrearCliente()
  const actualizar = useActualizarCliente()
  const pendiente = crear.isPending || actualizar.isPending
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClienteValues>({ resolver: zodResolver(esquema), defaultValues: VACIO })

  useEffect(() => {
    if (!open) return
    reset(
      cliente
        ? {
            nombre: cliente.nombre,
            telefono: cliente.telefono,
            direccion: cliente.direccion ?? '',
            notas: cliente.notas ?? '',
            consentimiento: false,
            esAlta: false,
          }
        : { ...VACIO, ...inicial },
    )
    // `inicial` suele ser un objeto nuevo en cada render: solo importa al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cliente, reset])

  const onSubmit = async (v: ClienteValues) => {
    const { consentimiento, esAlta: _esAlta, ...resto } = v
    const datos = { ...resto, direccion: v.direccion || null, notas: v.notas || null }
    try {
      const guardado = cliente
        ? await actualizar.mutateAsync({ id: cliente.id, cambios: consentimiento ? { ...datos, consentimiento: true } : datos })
        : await crear.mutateAsync({ ...datos, consentimiento: true })
      toast.success(cliente ? 'Cliente actualizado' : `${guardado.nombre} quedó registrado`)
      onGuardado?.(guardado)
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cliente ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          <DialogDescription>
            {cliente ? 'Los envíos ya registrados conservan sus datos.' : 'Con nombre y teléfono basta; lo demás es opcional.'}
          </DialogDescription>
        </DialogHeader>
        <form id="cliente-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cliente-nombre">Nombre o razón social</Label>
            <Input id="cliente-nombre" autoFocus autoComplete="off" {...register('nombre')} />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cliente-telefono">Teléfono</Label>
            <Input id="cliente-telefono" inputMode="tel" placeholder="0991234567" autoComplete="off" {...register('telefono')} />
            {errors.telefono && <p className="text-xs text-destructive">{errors.telefono.message}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cliente-direccion">Dirección (opcional)</Label>
            <Input id="cliente-direccion" placeholder="Calle, número, referencia" {...register('direccion')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cliente-notas">Notas (opcional)</Label>
            <Textarea id="cliente-notas" rows={2} placeholder="Paga a fin de mes, entregar en bodega…" {...register('notas')} />
          </div>
          <div className="sm:col-span-2">
            {cliente?.consentimientoEn ? (
              <p className="text-xs text-muted-foreground">
                Consentimiento para guardar sus datos registrado el {formatDateTime(cliente.consentimientoEn)}.
              </p>
            ) : (
              <ConsentimientoDatos id="cliente-consentimiento" error={errors.consentimiento?.message} {...register('consentimiento')} />
            )}
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="cliente-form" disabled={pendiente}>
            {pendiente && <Loader2 className="animate-spin" />}
            {cliente ? 'Guardar cambios' : 'Registrar cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
