import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck, FileDown, Loader2, Plus, Printer } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { CotizacionPanel } from '@/features/envios/components/CotizacionPanel'
import { ItemsEditor } from '@/features/envios/components/ItemsEditor'
import { ZonaPicker } from '@/features/envios/components/ZonaPicker'
import { generarGuia, MENSAJE_ERROR_GUIA, type AccionGuia } from '@/features/envios/guiaPdf'
import { itemsCotizables, itemVacio, type EnvioFormValues } from '@/features/envios/schema'
import { rutaLabel } from '@/features/rutas/hooks'
import { useDebounced } from '@/hooks/useDebounced'
import { errorMessage } from '@/lib/api'
import { INTERACTIVA, SELECCIONADA, SUPERFICIE } from '@/lib/estilos'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CotizacionRequest, EnvioPortal } from '@/types/api'
import { portalApi } from './api'
import {
  crearEnvioPortalSchema,
  envioDesdePortal,
  FORMAS_PAGO_PORTAL,
  tiposDesdeCatalogo,
  toNuevoEnvioPortal,
  type EnvioPortalFormValues,
} from './domain'
import { useCatalogoPortal, useClientePortal, useCrearEnvioPortal } from './hooks'

const DEFAULTS = {
  destinatarioNombre: '',
  destinatarioTelefono: '',
  destinatarioDireccion: '',
  rutaId: '',
  zona: 'URBANA',
  formaPago: 'CONTRATO',
  descripcion: '',
  items: [itemVacio()],
} as unknown as EnvioPortalFormValues

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className={cn('space-y-4 p-4', SUPERFICIE)}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{titulo}</p>
      {children}
    </section>
  )
}

function Campo({ label, htmlFor, error, children }: { label: string; htmlFor?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

/** Envío recién creado: la guía se ofrece de inmediato para pegarla en el paquete. */
function Creado({ envio, onOtro }: { envio: EnvioPortal; onOtro: () => void }) {
  const cliente = useClientePortal()
  const [pendiente, setPendiente] = useState<AccionGuia | null>(null)
  const guia = async (accion: AccionGuia) => {
    if (!cliente) return
    setPendiente(accion)
    try {
      await generarGuia(envioDesdePortal(envio, cliente), accion)
    } catch {
      toast.error(MENSAJE_ERROR_GUIA)
    } finally {
      setPendiente(null)
    }
  }
  return (
    <div className={cn('mx-auto max-w-md space-y-5 p-6 text-center', SUPERFICIE)} role="status" aria-label="Envío creado">
      <CircleCheck className="mx-auto size-10 text-brand-green-text" strokeWidth={1.5} />
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Guía</p>
        <p className="font-mono text-3xl font-semibold tracking-tight">{envio.numeroGuia}</p>
        <p className="text-sm text-muted-foreground">
          {envio.destinatario.nombre} · {rutaLabel(envio.ruta)} · {formatCurrency(envio.costo)}
        </p>
      </div>
      <p className="text-sm">Imprime la guía y pégala en el paquete antes de entregarlo.</p>
      <div className="flex flex-col gap-2">
        <Button size="lg" disabled={!cliente || !!pendiente} onClick={() => guia('imprimir')}>
          {pendiente === 'imprimir' ? <Loader2 className="animate-spin" /> : <Printer />}
          Imprimir guía
        </Button>
        <Button variant="outline" disabled={!cliente || !!pendiente} onClick={() => guia('descargar')}>
          {pendiente === 'descargar' ? <Loader2 className="animate-spin" /> : <FileDown />}
          Descargar PDF
        </Button>
      </div>
      <div className="flex justify-center gap-2 border-t pt-4">
        <Button variant="ghost" onClick={onOtro}>
          <Plus />
          Crear otro
        </Button>
        <Button variant="ghost" nativeButton={false} render={<Link to={`/portal/envios?envio=${envio.id}`} />}>
          Ver envío
        </Button>
      </div>
    </div>
  )
}

/** Alta de envío desde el portal: el remitente es la empresa; cotización en vivo con `/portal/cotizar`. */
export function NuevoEnvioPortalPage() {
  const { data: catalogo, isLoading: cargando, error: errorCatalogo } = useCatalogoPortal()
  const cliente = useClientePortal()
  const tipos = useMemo(() => tiposDesdeCatalogo(catalogo?.tiposCarga ?? []), [catalogo])
  const rutas = useMemo(() => catalogo?.rutas.filter((r) => r.operativa !== false) ?? [], [catalogo])
  const schema = useMemo(() => crearEnvioPortalSchema(tipos), [tipos])
  const crear = useCrearEnvioPortal()
  const [creado, setCreado] = useState<EnvioPortal | null>(null)
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EnvioPortalFormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })

  const [rutaId, items, zona] = useWatch({ control, name: ['rutaId', 'items', 'zona'] })
  const itemsKey = JSON.stringify(itemsCotizables(items, tipos))
  const request = useMemo<CotizacionRequest | null>(() => {
    const validos = JSON.parse(itemsKey) as CotizacionRequest['items'] | null
    return rutaId && validos ? { rutaId: Number(rutaId), items: validos, zona: zona ?? 'URBANA' } : null
  }, [rutaId, itemsKey, zona])
  const cotizacionReq = useDebounced(request, 350)

  // Las rutas del portal salen de la ciudad de la empresa hacia el resto (orden alfabético).
  const rutaItems = Object.fromEntries(rutas.map((r) => [String(r.id), rutaLabel({ origen: r.origen.nombre, destino: r.destino.nombre })]))
  const rutasOrdenadas = [...rutas].sort((a, b) => rutaItems[String(a.id)]!.localeCompare(rutaItems[String(b.id)]!, 'es'))

  const onSubmit = async (v: EnvioPortalFormValues) => {
    try {
      const envio = await crear.mutateAsync(toNuevoEnvioPortal(v))
      setCreado(envio)
      reset(DEFAULTS)
      window.scrollTo?.({ top: 0, behavior: 'smooth' })
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  if (creado) {
    return (
      <>
        <PageHeader title="Envío creado" />
        <Creado envio={creado} onOtro={() => setCreado(null)} />
      </>
    )
  }

  // ItemsEditor es del panel: comparte la forma de `items`, así que se le pasa el mismo control.
  const controlItems = control as unknown as Control<EnvioFormValues>
  const registerItems = register as unknown as UseFormRegister<EnvioFormValues>
  const erroresItems = errors as unknown as FieldErrors<EnvioFormValues>

  return (
    <>
      <PageHeader
        title="Nuevo envío"
        description={cliente ? `Remitente: ${cliente.nombre}${cliente.direccion ? ` · ${cliente.direccion}` : ''}` : undefined}
      />
      {errorCatalogo ? (
        <p className="text-sm text-destructive">{errorMessage(errorCatalogo)}</p>
      ) : cargando ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid items-start gap-4 lg:grid-cols-[1fr_320px]" aria-label="Nuevo envío">
          <div className="space-y-4">
            <Bloque titulo="Destinatario">
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Nombre" htmlFor="p-destinatario" error={errors.destinatarioNombre?.message}>
                  <Input id="p-destinatario" autoComplete="off" {...register('destinatarioNombre')} />
                </Campo>
                <Campo label="Teléfono" htmlFor="p-telefono" error={errors.destinatarioTelefono?.message}>
                  <Input id="p-telefono" inputMode="tel" placeholder="0991234567" {...register('destinatarioTelefono')} />
                </Campo>
                <div className="sm:col-span-2">
                  <Campo label="Dirección de entrega" htmlFor="p-direccion" error={errors.destinatarioDireccion?.message}>
                    <Input id="p-direccion" placeholder="Calle, número, referencia" {...register('destinatarioDireccion')} />
                  </Campo>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Zona de entrega</Label>
                <Controller
                  control={control}
                  name="zona"
                  render={({ field }) => <ZonaPicker value={field.value ?? 'URBANA'} onChange={field.onChange} />}
                />
              </div>
            </Bloque>

            <Bloque titulo="Carga">
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
                        {rutasOrdenadas.map((r) => (
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
                <ItemsEditor control={controlItems} register={registerItems} errors={erroresItems} tipos={tipos} />
              </div>
              <Campo label="Descripción (opcional)" htmlFor="p-descripcion" error={errors.descripcion?.message}>
                <Textarea id="p-descripcion" rows={1} placeholder="Ropa, repuestos, documentos…" {...register('descripcion')} />
              </Campo>
            </Bloque>
          </div>

          <div className="space-y-4 lg:sticky lg:top-20">
            <Bloque titulo="Pago">
              <Controller
                control={control}
                name="formaPago"
                render={({ field }) => (
                  <div role="radiogroup" aria-label="Forma de pago" className="grid grid-cols-2 gap-2">
                    {FORMAS_PAGO_PORTAL.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        role="radio"
                        aria-checked={field.value === f.value}
                        onClick={() => field.onChange(f.value)}
                        className={cn('rounded-xl px-3 py-2 text-left ring-1 ring-foreground/10', INTERACTIVA, field.value === f.value && SELECCIONADA)}
                      >
                        <span className="block text-sm font-medium">{f.label}</span>
                        <span className="block text-[11px] text-muted-foreground">{f.descripcion}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
              <CotizacionPanel request={cotizacionReq} tipos={tipos} cotizar={portalApi.cotizar} fuente="portal" />
            </Bloque>
            <Button type="submit" size="lg" className="w-full" disabled={crear.isPending}>
              {crear.isPending && <Loader2 className="animate-spin" />}
              Crear envío
            </Button>
          </div>
        </form>
      )}
    </>
  )
}
