import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2, TriangleAlert, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { BotonCopiar } from '@/components/BotonCopiar'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ATENCION_TONO } from '@/features/envios/ui'
import { useAccesosCliente, useCrearAcceso } from '@/features/usuarios/hooks'
import { ApiError, errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AccesoPortalCreado, Cliente } from '@/types/api'

const schema = z.object({
  nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
  email: z.string().trim().toLowerCase().pipe(z.email('Correo inválido')),
})
type Valores = z.input<typeof schema>

/** La contraseña temporal solo llega en la respuesta de alta: se muestra una vez, con copiar y aviso. */
function CredencialUnaVez({ acceso, onListo }: { acceso: AccesoPortalCreado; onListo: () => void }) {
  const texto = `Portal PCargo\nCorreo: ${acceso.usuario.email}\nContraseña temporal: ${acceso.passwordTemporal}`
  return (
    <div className="space-y-4" role="status" aria-label="Acceso creado">
      <div className="space-y-2 rounded-xl bg-muted/50 p-4">
        <p className="text-xs text-muted-foreground">Correo</p>
        <p className="font-medium break-all">{acceso.usuario.email}</p>
        <p className="pt-1 text-xs text-muted-foreground">Contraseña temporal</p>
        <div className="flex items-center gap-2">
          <code data-testid="password-temporal" className="flex-1 font-mono text-lg tracking-wider break-all">
            {acceso.passwordTemporal}
          </code>
          <BotonCopiar valor={acceso.passwordTemporal} etiqueta="Copiar contraseña" texto="Copiar" variant="outline" />
        </div>
      </div>
      <p className={cn('flex items-start gap-2 rounded-lg p-3 text-xs', ATENCION_TONO)}>
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <span>
          <strong>No se volverá a mostrar.</strong> Compártela con {acceso.usuario.nombre} por un canal seguro; podrá cambiarla en «Mi
          perfil» del portal. Si se pierde, un administrador puede restablecerla desde Usuarios.
        </span>
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <BotonCopiar valor={texto} etiqueta="Copiar correo y contraseña" texto="Copiar ambos" variant="ghost" />
        <Button onClick={onListo}>Listo</Button>
      </div>
    </div>
  )
}

/** Accesos al portal de un cliente empresa: lista y alta con contraseña temporal. Se monta con `key` por cliente. */
export function AccesosPortalDialog({ cliente, onClose }: { cliente: Cliente | null; onClose: () => void }) {
  const { data: accesos = [], isLoading, error } = useAccesosCliente(cliente?.id ?? null)
  const crear = useCrearAcceso(cliente?.id ?? '')
  const [creado, setCreado] = useState<AccesoPortalCreado | null>(null)
  const [formAbierto, setFormAbierto] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Valores>({ resolver: zodResolver(schema), defaultValues: { nombre: '', email: '' } })

  const onSubmit = async (v: Valores) => {
    try {
      const acceso = await crear.mutateAsync(schema.parse(v))
      setCreado(acceso)
      setFormAbierto(false)
      reset({ nombre: '', email: '' })
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setError('email', { message: 'Ese correo ya lo usa otro usuario' })
      else toast.error(errorMessage(e))
    }
  }

  const activos = accesos.filter((a) => a.activo)
  const sinAccesos = !isLoading && accesos.length === 0

  return (
    // Con la contraseña en pantalla no se cierra por un toque fuera: hay que confirmar con «Listo».
    <Dialog open={!!cliente} onOpenChange={(o) => !o && onClose()} disablePointerDismissal={!!creado}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md" showCloseButton={!creado}>
        <DialogHeader>
          <DialogTitle>Acceso al portal</DialogTitle>
          <DialogDescription>
            {creado
              ? 'Acceso creado. Copia la contraseña ahora.'
              : `Usuarios de ${cliente?.nombre} que ven sus envíos, crean envíos e imprimen guías.`}
          </DialogDescription>
        </DialogHeader>

        {creado ? (
          <CredencialUnaVez acceso={creado} onListo={() => setCreado(null)} />
        ) : (
          <div className="space-y-5">
            <section className="space-y-2" aria-label="Accesos del cliente">
              <SectionLabel aside={accesos.length ? `${activos.length} activos` : undefined}>Accesos</SectionLabel>
              {error ? (
                <p className="text-sm text-destructive">{errorMessage(error)}</p>
              ) : isLoading ? (
                <Skeleton className="h-12" />
              ) : sinAccesos ? (
                <p className="text-sm text-muted-foreground">Todavía nadie de esta empresa entra al portal.</p>
              ) : (
                <ul className="divide-y">
                  {accesos.map((a) => (
                    <li key={a.id} className={cn('flex items-center justify-between gap-3 py-2', !a.activo && 'opacity-60')}>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{a.nombre}</span>
                        <span className="block truncate text-xs text-muted-foreground">{a.email}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs text-muted-foreground">
                        <span className="block">{a.activo ? 'Activo' : 'Inactivo'}</span>
                        <span className="block tabular-nums">{formatDate(a.creadoEn)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {formAbierto || sinAccesos ? (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 border-t pt-4" aria-label="Nuevo acceso">
                <div className="space-y-1.5">
                  <Label htmlFor="acceso-nombre">Nombre de la persona</Label>
                  <Input id="acceso-nombre" autoComplete="off" aria-invalid={!!errors.nombre} {...register('nombre')} />
                  {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acceso-email">Correo</Label>
                  <Input id="acceso-email" type="email" inputMode="email" autoComplete="off" aria-invalid={!!errors.email} {...register('email')} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <KeyRound className="size-3.5" />
                  Se genera una contraseña temporal que verás una sola vez.
                </p>
                <DialogFooter>
                  {!sinAccesos && (
                    <Button type="button" variant="ghost" onClick={() => setFormAbierto(false)}>
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" disabled={crear.isPending}>
                    {crear.isPending && <Loader2 className="animate-spin" />}
                    Crear acceso
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <Button variant="outline" onClick={() => setFormAbierto(true)}>
                <UserPlus />
                Nuevo acceso
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
