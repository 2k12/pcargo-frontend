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
import { crearEnvioSchema, toNuevoEnvio, type EnvioFormValues } from '../schema'
import { CotizacionPanel } from './CotizacionPanel'
import { TipoCargaPicker } from './TipoCargaPicker'

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
    defaultValues: { rutaId: '', descripcion: '' },
  })

  const [rutaId, tipoCarga, pesoKg] = useWatch({ control, name: ['rutaId', 'tipoCarga', 'pesoKg'] })
  const tipo = tipos.find((t) => t.codigo === tipoCarga)
  const cotizable = !!rutaId && !!tipo && Number.isFinite(pesoKg) && pesoKg > 0 && pesoKg <= tipo.pesoMaxKg
  const request = useMemo<CotizacionRequest | null>(
    () => (cotizable ? { rutaId: Number(rutaId), tipoCarga, pesoKg } : null),
    [cotizable, rutaId, tipoCarga, pesoKg],
  )
  const cotizacionReq = useDebounced(request, 350)

  const rutaItems = Object.fromEntries(rutas.map((r) => [String(r.id), rutaLabel({ origen: r.origen.nombre, destino: r.destino.nombre })]))

  const onSubmit = async (values: EnvioFormValues) => {
    try {
      const envio = await crear.mutateAsync(toNuevoEnvio(values))
      toast.success(`Envío ${envio.codigo} registrado`)
      reset()
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
            <Campo label="Tipo de carga" error={errors.tipoCarga?.message}>
              <Controller
                control={control}
                name="tipoCarga"
                render={({ field }) => <TipoCargaPicker tipos={tipos} value={field.value} onChange={field.onChange} />}
              />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <Campo label="Peso (kg)" htmlFor="pesoKg" error={errors.pesoKg?.message}>
                <Input id="pesoKg" type="number" step="0.1" min="0" {...register('pesoKg', { valueAsNumber: true })} />
              </Campo>
              <Campo label="Descripción (opcional)" htmlFor="descripcion" error={errors.descripcion?.message}>
                <Textarea id="descripcion" rows={1} placeholder="Documentos, ropa, repuestos…" {...register('descripcion')} />
              </Campo>
            </div>
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
