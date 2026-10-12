import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { errorMessage } from '@/lib/api'
import type { TipoCarga } from '@/types/api'
import {
  cambiosTipo,
  codigoDesdeNombre,
  datosDesdeForm,
  formDesdeTipo,
  normalizarCodigo,
  TIPO_FORM_VACIO,
  tipoCargaSchema,
  type TipoCargaForm,
} from '../domain'
import { useActualizarTipoCarga, useCrearTipoCarga } from '../hooks'

function CampoError({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <p id={id} className="text-xs text-destructive">
      {msg}
    </p>
  ) : null
}

/** Campo de monto en USD con el símbolo delante; admite coma decimal. */
function CampoDinero({
  id,
  label,
  ayuda,
  error,
  ...input
}: { id: string; label: string; ayuda?: string; error?: string } & React.ComponentProps<typeof Input>) {
  const describedBy = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
          $
        </span>
        <Input id={id} inputMode="decimal" autoComplete="off" className="pl-6" aria-invalid={!!error} aria-describedby={describedBy} {...input} />
      </div>
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      )}
      <CampoError id={`${id}-error`} msg={error} />
    </div>
  )
}

/** Alta o edición de un tipo de carga (contrato v11). El código se propone a partir del nombre y no cambia después. */
export function TipoCargaFormDialog({
  open,
  onOpenChange,
  tipo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sin tipo: alta. */
  tipo?: TipoCarga | null
}) {
  const crear = useCrearTipoCarga()
  const actualizar = useActualizarTipoCarga()
  const pendiente = crear.isPending || actualizar.isPending
  const editando = !!tipo

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getFieldState,
    formState: { errors },
  } = useForm<TipoCargaForm>({ resolver: zodResolver(tipoCargaSchema), defaultValues: TIPO_FORM_VACIO })

  useEffect(() => {
    if (!open) return
    reset(tipo ? formDesdeTipo(tipo) : TIPO_FORM_VACIO)
  }, [open, tipo, reset])

  const conMayoreo = useWatch({ control, name: 'conMayoreo' })

  const nombreReg = register('nombre', {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      // Mientras el ADMIN no toque el código, se sigue generando desde el nombre.
      if (!editando && !getFieldState('codigo').isDirty) setValue('codigo', codigoDesdeNombre(e.target.value))
    },
  })
  const codigoReg = register('codigo', {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue('codigo', normalizarCodigo(e.target.value), { shouldDirty: true })
    },
  })

  const onSubmit = async (v: TipoCargaForm) => {
    const datos = datosDesdeForm(v)
    try {
      if (tipo) {
        const cambios = cambiosTipo(tipo, datos)
        if (Object.keys(cambios).length === 0) {
          onOpenChange(false)
          return
        }
        await actualizar.mutateAsync({ codigo: tipo.codigo, cambios })
        toast.success(`«${datos.nombre}» actualizado`)
      } else {
        await crear.mutateAsync({ ...datos, codigo: v.codigo.trim() })
        toast.success(`Tipo «${datos.nombre}» creado`)
      }
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? `Editar «${tipo!.nombre}»` : 'Nuevo tipo de carga'}</DialogTitle>
          <DialogDescription>
            Precio por unidad en USD. Los envíos ya registrados conservan su precio; los cambios aplican a cotizaciones y envíos nuevos.
          </DialogDescription>
        </DialogHeader>
        <form id="tipo-carga-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tc-nombre">Nombre</Label>
            <Input
              id="tc-nombre"
              autoComplete="off"
              maxLength={40}
              placeholder="p. ej. Caja grande"
              aria-invalid={!!errors.nombre}
              aria-describedby={errors.nombre ? 'tc-nombre-error' : undefined}
              {...nombreReg}
            />
            <CampoError id="tc-nombre-error" msg={errors.nombre?.message} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tc-codigo">Código</Label>
            <Input
              id="tc-codigo"
              autoComplete="off"
              spellCheck={false}
              maxLength={30}
              className="font-mono uppercase"
              readOnly={editando}
              aria-readonly={editando}
              aria-invalid={!!errors.codigo}
              aria-describedby={errors.codigo ? 'tc-codigo-ayuda tc-codigo-error' : 'tc-codigo-ayuda'}
              {...codigoReg}
            />
            <p id="tc-codigo-ayuda" className="text-xs text-muted-foreground">
              {editando
                ? 'El código no se puede cambiar: lo guardan los envíos.'
                : 'Se genera a partir del nombre; puedes editarlo. No se podrá cambiar después.'}
            </p>
            <CampoError id="tc-codigo-error" msg={errors.codigo?.message} />
          </div>

          <CampoDinero id="tc-precio" label="Precio urbano" placeholder="3,00" error={errors.precio?.message} {...register('precio')} />
          <CampoDinero
            id="tc-precio-rural"
            label="Precio rural (opcional)"
            placeholder="Igual al urbano"
            ayuda="Vacío: igual al urbano."
            error={errors.precioRural?.message}
            {...register('precioRural')}
          />

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tc-peso">Peso máximo por unidad (kg)</Label>
            <Input
              id="tc-peso"
              inputMode="decimal"
              autoComplete="off"
              placeholder="50"
              aria-invalid={!!errors.pesoMaxKg}
              aria-describedby={errors.pesoMaxKg ? 'tc-peso-error' : undefined}
              {...register('pesoMaxKg')}
            />
            <CampoError id="tc-peso-error" msg={errors.pesoMaxKg?.message} />
          </div>

          <fieldset className="space-y-3 rounded-xl p-3 ring-1 ring-foreground/10 sm:col-span-2">
            <legend className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Precio por volumen</legend>
            <Controller
              control={control}
              name="conMayoreo"
              render={({ field }) => (
                <label htmlFor="tc-mayoreo" className="flex items-start gap-2 text-sm">
                  <Checkbox id="tc-mayoreo" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                  <span>
                    Aplicar mayoreo
                    <span className="block text-xs text-muted-foreground">
                      Con más de N unidades del tipo en un envío, todas cuestan el precio por volumen, en cualquier zona.
                    </span>
                  </span>
                </label>
              )}
            />
            {conMayoreo && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tc-mayoreo-minimo">Más de (unidades)</Label>
                  <Input
                    id="tc-mayoreo-minimo"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="50"
                    aria-invalid={!!errors.mayoreoMinimo}
                    aria-describedby={errors.mayoreoMinimo ? 'tc-mayoreo-minimo-error' : undefined}
                    {...register('mayoreoMinimo')}
                  />
                  <CampoError id="tc-mayoreo-minimo-error" msg={errors.mayoreoMinimo?.message} />
                </div>
                <CampoDinero
                  id="tc-mayoreo-precio"
                  label="Precio por volumen"
                  placeholder="1,00"
                  error={errors.mayoreoPrecio?.message}
                  {...register('mayoreoPrecio')}
                />
              </div>
            )}
          </fieldset>

          <div className="flex items-center justify-between gap-3 rounded-xl p-3 ring-1 ring-foreground/10 sm:col-span-2">
            <div className="space-y-0.5">
              <Label htmlFor="tc-activo">Activo</Label>
              <p className="text-xs text-muted-foreground">Inactivo, no se ofrece en el panel, la landing ni la API de empresas.</p>
            </div>
            <Controller
              control={control}
              name="activo"
              render={({ field }) => <Switch id="tc-activo" checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="tipo-carga-form" disabled={pendiente}>
            {pendiente ? <Loader2 className="animate-spin" /> : !editando && <Plus />}
            {editando ? 'Guardar cambios' : 'Crear tipo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
