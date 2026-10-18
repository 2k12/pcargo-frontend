import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Wand2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { BotonCopiar } from '@/components/BotonCopiar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MENSAJE_CONTRASENA_REGLAS } from '@/features/perfil/schema'
import { errorMessage } from '@/lib/api'
import type { UsuarioAdmin } from '@/types/api'
import { generarPassword, passwordSchema } from '../domain'
import { useActualizarUsuario } from '../hooks'

const schema = z.object({ password: passwordSchema })

/** El ADMIN fija una contraseña nueva y se la comunica al usuario, que luego la cambia en su perfil. */
export function RestablecerPasswordDialog({ usuario, onClose }: { usuario: UsuarioAdmin | null; onClose: () => void }) {
  const actualizar = useActualizarUsuario()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { password: '' } })
  const password = useWatch({ control, name: 'password' })

  useEffect(() => {
    if (usuario) reset({ password: generarPassword() })
  }, [usuario, reset])

  const onSubmit = async ({ password: nueva }: z.infer<typeof schema>) => {
    if (!usuario) return
    try {
      await actualizar.mutateAsync({ id: usuario.id, cambios: { password: nueva } })
      toast.success(`Contraseña de ${usuario.nombre} restablecida`, { description: 'Comunícasela por un canal seguro.' })
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Dialog open={!!usuario} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>
            {usuario?.nombre} entrará con esta contraseña y podrá cambiarla en «Mi perfil». Cópiala antes de guardar.
          </DialogDescription>
        </DialogHeader>
        <form id="form-restablecer" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-1.5">
          <Label htmlFor="nueva-password">Contraseña nueva</Label>
          <div className="flex gap-2">
            <Input id="nueva-password" autoComplete="off" maxLength={72} className="font-mono" {...register('password')} />
            {password && <BotonCopiar valor={password} etiqueta="Copiar contraseña" variant="outline" size="icon" />}
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Generar otra"
              title="Generar otra"
              onClick={() => setValue('password', generarPassword(), { shouldValidate: true })}
            >
              <Wand2 />
            </Button>
          </div>
          <p className={errors.password ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
            {errors.password?.message ?? MENSAJE_CONTRASENA_REGLAS}
          </p>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-restablecer" disabled={actualizar.isPending}>
            {actualizar.isPending && <Loader2 className="animate-spin" />}
            Restablecer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
