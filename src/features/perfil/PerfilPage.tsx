import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2, UserRound } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/hooks'
import { ApiError, errorMessage } from '@/lib/api'
import { iniciales } from '@/lib/format'
import type { Usuario } from '@/types/api'
import { useActualizarPerfil, useCambiarContrasena } from './hooks'
import {
  cambiosPerfil,
  contrasenaSchema,
  MENSAJE_CONTRASENA_REGLAS,
  perfilSchema,
  type ContrasenaValues,
  type PerfilValues,
} from './schema'

function Campo({
  id,
  label,
  error,
  ayuda,
  children,
}: {
  id: string
  label: string
  error?: string
  ayuda?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
            {ayuda}
          </p>
        )
      )}
    </div>
  )
}

const describir = (id: string, error?: unknown, ayuda?: boolean) =>
  error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined

function DatosForm({ usuario }: { usuario: Usuario }) {
  const actualizar = useActualizarPerfil()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<PerfilValues>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { nombre: usuario.nombre, email: usuario.email },
  })

  useEffect(() => {
    reset({ nombre: usuario.nombre, email: usuario.email })
  }, [usuario.nombre, usuario.email, reset])

  const onSubmit = async (v: PerfilValues) => {
    const cambios = cambiosPerfil(usuario, v)
    if (Object.keys(cambios).length === 0) {
      reset({ nombre: usuario.nombre, email: usuario.email })
      toast.info('No hay cambios que guardar')
      return
    }
    try {
      await actualizar.mutateAsync(cambios)
      toast.success('Perfil actualizado')
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError('email', { message: 'Ese correo ya lo usa otro usuario' })
      } else {
        toast.error(errorMessage(e))
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-4 text-muted-foreground" />
          Datos personales
        </CardTitle>
        <CardDescription>Tu nombre aparece como operador en los envíos que registras y gestionas.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Datos personales" className="flex flex-col gap-(--card-spacing)">
        <CardContent className="space-y-4">
          <Campo id="perfil-nombre" label="Nombre" error={errors.nombre?.message}>
            <Input
              id="perfil-nombre"
              autoComplete="name"
              maxLength={80}
              aria-invalid={!!errors.nombre}
              aria-describedby={describir('perfil-nombre', errors.nombre)}
              {...register('nombre')}
            />
          </Campo>
          <Campo id="perfil-email" label="Correo" error={errors.email?.message} ayuda="Con este correo inicias sesión.">
            <Input
              id="perfil-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={describir('perfil-email', errors.email, true)}
              {...register('email')}
            />
          </Campo>
          <p className="text-xs text-muted-foreground">
            Rol: <span className="font-medium text-foreground">{usuario.rol === 'ADMIN' ? 'Administrador' : 'Operador'}</span> (lo
            asigna un administrador)
          </p>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t">
          <Button type="submit" disabled={!isDirty || actualizar.isPending}>
            {actualizar.isPending && <Loader2 className="animate-spin" />}
            Guardar cambios
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

const CONTRASENA_VACIA: ContrasenaValues = { actual: '', nueva: '', confirmar: '' }

function ContrasenaForm() {
  const cambiar = useCambiarContrasena()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<ContrasenaValues>({ resolver: zodResolver(contrasenaSchema), defaultValues: CONTRASENA_VACIA })

  const onSubmit = async ({ actual, nueva }: ContrasenaValues) => {
    try {
      await cambiar.mutateAsync({ actual, nueva })
      reset(CONTRASENA_VACIA)
      toast.success('Contraseña actualizada')
    } catch (e) {
      // 422: la actual no coincide. No es un 401, así que la sesión sigue abierta.
      if (e instanceof ApiError && e.code === 'CONTRASENA_INCORRECTA') {
        setError('actual', { message: 'La contraseña actual no es correcta' })
        setFocus('actual')
      } else {
        toast.error(errorMessage(e))
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          Cambiar contraseña
        </CardTitle>
        <CardDescription>Tu sesión sigue abierta después del cambio.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Cambiar contraseña" className="flex flex-col gap-(--card-spacing)">
        <CardContent className="space-y-4">
          <Campo id="pass-actual" label="Contraseña actual" error={errors.actual?.message}>
            <Input
              id="pass-actual"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.actual}
              aria-describedby={describir('pass-actual', errors.actual)}
              {...register('actual')}
            />
          </Campo>
          <Campo id="pass-nueva" label="Nueva contraseña" error={errors.nueva?.message} ayuda={MENSAJE_CONTRASENA_REGLAS}>
            <Input
              id="pass-nueva"
              type="password"
              autoComplete="new-password"
              maxLength={72}
              aria-invalid={!!errors.nueva}
              aria-describedby={describir('pass-nueva', errors.nueva, true)}
              {...register('nueva')}
            />
          </Campo>
          <Campo id="pass-confirmar" label="Confirmar nueva contraseña" error={errors.confirmar?.message}>
            <Input
              id="pass-confirmar"
              type="password"
              autoComplete="new-password"
              maxLength={72}
              aria-invalid={!!errors.confirmar}
              aria-describedby={describir('pass-confirmar', errors.confirmar)}
              {...register('confirmar')}
            />
          </Campo>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button type="submit" disabled={cambiar.isPending}>
            {cambiar.isPending && <Loader2 className="animate-spin" />}
            Cambiar contraseña
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export function PerfilPage() {
  const { usuario } = useAuth()
  if (!usuario) return null
  return (
    <>
      <PageHeader title="Mi perfil" description="Tus datos de acceso al panel." />
      <div className="flex items-center gap-3">
        <Avatar className="size-12">
          <AvatarFallback>{iniciales(usuario.nombre)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{usuario.nombre}</p>
          <p className="truncate text-sm text-muted-foreground">{usuario.email}</p>
        </div>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <DatosForm usuario={usuario} />
        <ContrasenaForm />
      </div>
    </>
  )
}
