import { zodResolver } from '@hookform/resolvers/zod'
import { Hash, Loader2, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { CodigoAcceso } from '@/types/api'
import { Campo } from './components/Campo'
import { describir } from './components/describir'
import { useActivarCodigoAcceso, useCodigoAcceso, useDesactivarCodigoAcceso } from './hooks'
import { codigoAccesoSchema, MENSAJE_CODIGO_REGLAS, type CodigoAccesoValues } from './schema'

const CODIGO_VACIO: CodigoAccesoValues = { codigo: '', confirmar: '', password: '' }

function EstadoCodigo({ estado }: { estado: CodigoAcceso }) {
  if (!estado.activo) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">No activado</Badge>
        Solo puedes entrar con tu correo y contraseña.
      </p>
    )
  }
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Badge variant="secondary">Activo</Badge>
      {estado.actualizadoEn ? `Activo desde ${formatDate(estado.actualizadoEn)}` : 'Activo'}
    </p>
  )
}

/** Código único de acceso (contrato v17): activar, cambiar o desactivar desde el perfil. */
export function CodigoAccesoForm() {
  const estado = useCodigoAcceso()
  const activar = useActivarCodigoAcceso()
  const desactivar = useDesactivarCodigoAcceso()
  const [confirmando, setConfirmando] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<CodigoAccesoValues>({ resolver: zodResolver(codigoAccesoSchema), defaultValues: CODIGO_VACIO })

  const activo = estado.data?.activo ?? false

  const onSubmit = async ({ codigo, password }: CodigoAccesoValues) => {
    try {
      await activar.mutateAsync({ codigo, password })
      reset(CODIGO_VACIO)
      toast.success(activo ? 'Código actualizado' : 'Código activado')
    } catch (e) {
      // 422: la contraseña no coincide. No es un 401, así que la sesión sigue abierta.
      if (e instanceof ApiError && e.code === 'CONTRASENA_INCORRECTA') {
        setError('password', { message: 'La contraseña actual no es correcta' })
        setFocus('password')
      } else if (e instanceof ApiError && e.status === 409) {
        setError('codigo', { message: 'Ese código no está disponible, elige otro' })
        setFocus('codigo')
      } else {
        toast.error(errorMessage(e))
      }
    }
  }

  const onDesactivar = async () => {
    try {
      await desactivar.mutateAsync()
      setConfirmando(false)
      reset(CODIGO_VACIO)
      toast.success('Código desactivado')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="size-4 text-muted-foreground" />
          Código único de acceso
        </CardTitle>
        <CardDescription>
          Sirve para entrar rápido: en el inicio de sesión eliges «Código único» y escribes solo este código, sin correo ni
          contraseña. Es personal; no lo compartas con nadie.
        </CardDescription>
      </CardHeader>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label="Código único de acceso"
        className="flex flex-col gap-(--card-spacing)"
      >
        <CardContent className="space-y-4">
          {estado.isPending ? (
            <Skeleton className="h-6 w-48" aria-label="Cargando estado del código" />
          ) : estado.isError ? (
            <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
              No se pudo cargar el estado del código.
              <Button type="button" variant="outline" size="sm" onClick={() => estado.refetch()}>
                <RotateCw />
                Reintentar
              </Button>
            </div>
          ) : (
            <EstadoCodigo estado={estado.data} />
          )}
          <Campo
            id="codigo-nuevo"
            label={activo ? 'Nuevo código' : 'Código'}
            error={errors.codigo?.message}
            ayuda={MENSAJE_CODIGO_REGLAS}
          >
            <Input
              id="codigo-nuevo"
              type="password"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={32}
              aria-invalid={!!errors.codigo}
              aria-describedby={describir('codigo-nuevo', errors.codigo, true)}
              {...register('codigo')}
            />
          </Campo>
          <Campo id="codigo-confirmar" label="Confirmar código" error={errors.confirmar?.message}>
            <Input
              id="codigo-confirmar"
              type="password"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={32}
              aria-invalid={!!errors.confirmar}
              aria-describedby={describir('codigo-confirmar', errors.confirmar)}
              {...register('confirmar')}
            />
          </Campo>
          <Campo
            id="codigo-password"
            label="Tu contraseña actual"
            error={errors.password?.message}
            ayuda="Confirma que eres tú."
          >
            <Input
              id="codigo-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              aria-describedby={describir('codigo-password', errors.password, true)}
              {...register('password')}
            />
          </Campo>
        </CardContent>
        <CardFooter className="flex-wrap justify-end gap-2 border-t">
          {activo && (
            <Button type="button" variant="outline" onClick={() => setConfirmando(true)} disabled={desactivar.isPending}>
              Desactivar
            </Button>
          )}
          <Button type="submit" disabled={activar.isPending || estado.isPending}>
            {activar.isPending && <Loader2 className="animate-spin" />}
            {activo ? 'Cambiar código' : 'Activar código'}
          </Button>
        </CardFooter>
      </form>

      <AlertDialog open={confirmando} onOpenChange={(o) => !o && setConfirmando(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar el código único?</AlertDialogTitle>
            <AlertDialogDescription>
              Ya no podrás entrar con él; tendrás que usar tu correo y contraseña. Puedes activar uno nuevo cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={desactivar.isPending} onClick={onDesactivar}>
              {desactivar.isPending && <Loader2 className="animate-spin" />}
              Desactivar código
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
