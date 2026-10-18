import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Loader2, Wand2, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/features/auth/hooks'
import { ROL_LABEL, ROLES } from '@/features/auth/roles'
import { useClientes } from '@/features/clientes/api'
import { ClienteBuscador } from '@/features/clientes/components/ClienteBuscador'
import { MENSAJE_CONTRASENA_REGLAS } from '@/features/perfil/schema'
import { ApiError, errorMessage } from '@/lib/api'
import type { Rol, UsuarioAdmin } from '@/types/api'
import {
  cambiosUsuario,
  editarUsuarioSchema,
  generarPassword,
  nuevoUsuarioSchema,
  rolesEditables,
  toNuevoUsuario,
  type NuevoUsuarioValues,
} from '../domain'
import { useActualizarUsuario, useCrearUsuario } from '../hooks'

const DESCRIPCION_ROL: Record<Rol, string> = {
  ADMIN: 'Todo el panel, configuración, usuarios y datos personales.',
  OPERADOR: 'Envíos, clientes, cotización, resumen y caja.',
  REPARTIDOR: 'Solo la app del repartidor: sus entregas y su caja.',
  CLIENTE: 'Solo el portal de su empresa: sus envíos y guías.',
}

function Campo({ id, label, error, ayuda, children }: { id?: string; label: string; error?: string; ayuda?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  )
}

const VACIO: NuevoUsuarioValues = { nombre: '', email: '', password: '', rol: 'OPERADOR', clienteId: '' }

/** Alta y edición de un usuario. La contraseña solo se pide al crear (luego se restablece aparte). */
export function UsuarioFormDialog({
  open,
  onOpenChange,
  usuario,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** null = nuevo. */
  usuario: UsuarioAdmin | null
}) {
  const { usuario: yo } = useAuth()
  const editando = !!usuario
  const crear = useCrearUsuario()
  const actualizar = useActualizarUsuario()
  const { data: clientes = [] } = useClientes()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<NuevoUsuarioValues>({
    // En edición no hay contraseña: se valida con el esquema sin ella.
    resolver: zodResolver(editando ? (editarUsuarioSchema as unknown as typeof nuevoUsuarioSchema) : nuevoUsuarioSchema),
    defaultValues: VACIO,
  })

  useEffect(() => {
    if (!open) return
    reset(
      usuario
        ? { nombre: usuario.nombre, email: usuario.email, password: '', rol: usuario.rol, clienteId: usuario.clienteId ?? '' }
        : VACIO,
    )
  }, [open, usuario, reset])

  const [rol, clienteId] = useWatch({ control, name: ['rol', 'clienteId'] })
  const cliente = clienteId ? clientes.find((c) => c.id === clienteId) : undefined
  const roles = usuario ? rolesEditables(usuario, usuario.id === yo?.id) : ROLES
  const rolItems = Object.fromEntries(roles.map((r) => [r, ROL_LABEL[r]]))
  const pendiente = crear.isPending || actualizar.isPending

  const onSubmit = async (v: NuevoUsuarioValues) => {
    try {
      if (usuario) {
        const cambios = cambiosUsuario(usuario, editarUsuarioSchema.parse(v))
        if (Object.keys(cambios).length === 0) {
          onOpenChange(false)
          return
        }
        await actualizar.mutateAsync({ id: usuario.id, cambios })
        toast.success('Usuario actualizado')
      } else {
        const creado = await crear.mutateAsync(toNuevoUsuario(nuevoUsuarioSchema.parse(v)))
        toast.success(`${creado.nombre} ya puede iniciar sesión`, { description: 'Comunícale su correo y la contraseña inicial.' })
      }
      onOpenChange(false)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setError('email', { message: 'Ese correo ya lo usa otro usuario' })
      else toast.error(errorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          <DialogDescription>
            {editando ? 'Cambia sus datos o su rol. La contraseña se restablece desde el menú del usuario.' : 'Crea un acceso con su rol.'}
          </DialogDescription>
        </DialogHeader>
        <form id="form-usuario" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Campo id="usuario-nombre" label="Nombre" error={errors.nombre?.message}>
            <Input id="usuario-nombre" autoComplete="off" maxLength={80} {...register('nombre')} />
          </Campo>
          <Campo id="usuario-email" label="Correo" error={errors.email?.message} ayuda="Con este correo inicia sesión.">
            <Input id="usuario-email" type="email" inputMode="email" autoComplete="off" {...register('email')} />
          </Campo>
          <Campo label="Rol" error={errors.rol?.message} ayuda={rol ? DESCRIPCION_ROL[rol] : undefined}>
            <Controller
              control={control}
              name="rol"
              render={({ field }) => (
                <Select items={rolItems} value={field.value} onValueChange={(v) => v && field.onChange(v)} disabled={roles.length === 1}>
                  <SelectTrigger className="w-full" aria-label="Rol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROL_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Campo>
          {rol === 'CLIENTE' &&
            (editando ? (
              <p className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <Building2 className="size-4 text-muted-foreground" />
                {usuario?.cliente ?? 'Sin cliente vinculado'}
              </p>
            ) : (
              <Campo label="Cliente de este acceso" error={errors.clienteId?.message}>
                {cliente ? (
                  <div className="flex items-center gap-3 rounded-lg bg-accent/60 px-3 py-2 text-sm ring-1 ring-primary/30">
                    <Building2 className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{cliente.nombre}</span>
                      <span className="block truncate text-xs text-muted-foreground">{cliente.telefono}</span>
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setValue('clienteId', '')}>
                      <X />
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <ClienteBuscador
                    clientes={clientes}
                    onSelect={(c) => setValue('clienteId', c.id, { shouldValidate: true })}
                    label="Buscar cliente del acceso"
                    placeholder="Busca la empresa por nombre o teléfono"
                  />
                )}
              </Campo>
            ))}
          {!editando && (
            <Campo id="usuario-password" label="Contraseña inicial" error={errors.password?.message} ayuda={MENSAJE_CONTRASENA_REGLAS}>
              <div className="flex gap-2">
                <Input id="usuario-password" autoComplete="new-password" maxLength={72} className="font-mono" {...register('password')} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setValue('password', generarPassword(), { shouldValidate: true })}
                  aria-label="Generar contraseña"
                  title="Generar contraseña"
                >
                  <Wand2 />
                  <span className="hidden sm:inline">Generar</span>
                </Button>
              </div>
            </Campo>
          )}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="form-usuario" disabled={pendiente}>
            {pendiente && <Loader2 className="animate-spin" />}
            {editando ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
