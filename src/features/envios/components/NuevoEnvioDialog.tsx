import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
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
import { Textarea } from '@/components/ui/textarea'
import { rutaLabel, useRutas } from '@/features/rutas/hooks'
import { useDebounced } from '@/hooks/useDebounced'
import { errorMessage } from '@/lib/api'
import type { CotizacionRequest } from '@/types/api'
import { TIPOS_CARGA_DEFAULT } from '../domain'
import { useCrearEnvio, useTiposCarga } from '../hooks'
import { crearEnvioSchema, itemsCotizables, itemVacio, toNuevoEnvio, type EnvioFormValues } from '../schema'
import { CotizacionPanel } from './CotizacionPanel'
import { FormaPagoPicker } from './FormaPagoPicker'
import { ItemsEditor } from './ItemsEditor'

const DEFAULTS = {
  rutaId: '',
  descripcion: '',
  items: [itemVacio()],
} as unknown as Partial<EnvioFormValues>

function Campo({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function NuevoEnvioDialog() {
  const [open, setOpen] = useState(false)
  const { data: tipos = TIPOS_CARGA_DEFAULT } = useTiposCarga()
  const { data: rutas = [] } = useRutas(true)
  const crear = useCrearEnvio()
  const schema = useMemo(() => crearEnvioSchema(tipos), [tipos])

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EnvioFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })

  const [rutaId, items] = useWatch({ control, name: ['rutaId', 'items'] })
  // JSON estable: useWatch devuelve un array nuevo en cada render del field array.
  const itemsKey = JSON.stringify(itemsCotizables(items, tipos))
  const request = useMemo<CotizacionRequest | null>(() => {
    const validos = JSON.parse(itemsKey) as CotizacionRequest['items'] | null
    return rutaId && validos ? { rutaId: Number(rutaId), items: validos } : null
  }, [rutaId, itemsKey])
  const cotizacionReq = useDebounced(request, 350)

  const rutaItems = Object.fromEntries(rutas.map((r) => [String(r.id), rutaLabel({ origen: r.origen.nombre, destino: r.destino.nombre })]))

  const onSubmit = async (values: EnvioFormValues) => {
    try {
      const envio = await crear.mutateAsync(toNuevoEnvio(values))
      toast.success(`Envío ${envio.codigo} registrado`)
      reset(DEFAULTS)
      setOpen(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Nuevo envío
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo envío</DialogTitle>
          <DialogDescription>Registra una encomienda y obtén su código de seguimiento.</DialogDescription>
        </DialogHeader>

        <form id="nuevo-envio" onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <section className="grid gap-4 sm:grid-cols-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase sm:col-span-2">Remitente</p>
            <Campo label="Nombre" htmlFor="remitenteNombre" error={errors.remitenteNombre?.message}>
              <Input id="remitenteNombre" {...register('remitenteNombre')} />
            </Campo>
            <Campo label="Teléfono" htmlFor="remitenteTelefono" error={errors.remitenteTelefono?.message}>
              <Input id="remitenteTelefono" inputMode="tel" placeholder="0991234567" {...register('remitenteTelefono')} />
            </Campo>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase sm:col-span-2">Destinatario</p>
            <Campo label="Nombre" htmlFor="destinatarioNombre" error={errors.destinatarioNombre?.message}>
              <Input id="destinatarioNombre" {...register('destinatarioNombre')} />
            </Campo>
            <Campo label="Teléfono" htmlFor="destinatarioTelefono" error={errors.destinatarioTelefono?.message}>
              <Input id="destinatarioTelefono" inputMode="tel" {...register('destinatarioTelefono')} />
            </Campo>
            <div className="sm:col-span-2">
              <Campo label="Dirección de entrega" htmlFor="destinatarioDireccion" error={errors.destinatarioDireccion?.message}>
                <Input id="destinatarioDireccion" placeholder="Calle, número, referencia" {...register('destinatarioDireccion')} />
              </Campo>
            </div>
          </section>

          <section className="space-y-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Carga</p>
            <Campo label="Ruta" error={errors.rutaId?.message}>
              <Controller
                control={control}
                name="rutaId"
                render={({ field }) => (
                  <Select items={rutaItems} value={field.value || null} onValueChange={(v) => field.onChange(v ?? '')}>
                    <SelectTrigger className="w-full" aria-label="Ruta">
                      <SelectValue placeholder="Selecciona origen → destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {rutas.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {rutaItems[String(r.id)]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Campo>
            <div className="space-y-1.5">
              <Label>Ítems</Label>
              <ItemsEditor control={control} register={register} errors={errors} tipos={tipos} />
            </div>
            <Campo label="Forma de pago" error={errors.formaPago?.message}>
              <Controller
                control={control}
                name="formaPago"
                render={({ field }) => (
                  <FormaPagoPicker value={field.value} onChange={field.onChange} invalid={!!errors.formaPago} />
                )}
              />
            </Campo>
            <Campo label="Descripción (opcional)" htmlFor="descripcion" error={errors.descripcion?.message}>
              <Textarea id="descripcion" rows={1} placeholder="Documentos, ropa, repuestos…" {...register('descripcion')} />
            </Campo>
          </section>

          <CotizacionPanel request={cotizacionReq} />
        </form>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="nuevo-envio" disabled={crear.isPending}>
            {crear.isPending && <Loader2 className="animate-spin" />}
            Registrar envío
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
