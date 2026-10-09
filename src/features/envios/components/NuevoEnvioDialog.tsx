import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, UserCheck, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useClientes } from '@/features/clientes/api'
import { ClienteBuscador } from '@/features/clientes/components/ClienteBuscador'
import { ConsentimientoDatos } from '@/features/clientes/components/ConsentimientoDatos'
import { clientePorTelefono, digitos } from '@/features/clientes/domain'
import { rutaLabel, useRutas } from '@/features/rutas/hooks'
import { useDebounced } from '@/hooks/useDebounced'
import { errorMessage } from '@/lib/api'
import type { Cliente, CotizacionRequest } from '@/types/api'
import { TIPOS_CARGA_DEFAULT, zonaInfluye } from '../domain'
import { useCrearEnvio, useTiposCarga } from '../hooks'
import { crearEnvioSchema, itemsCotizables, itemVacio, toNuevoEnvio, type EnvioFormValues } from '../schema'
import { CotizacionPanel } from './CotizacionPanel'
import { FormaPagoPicker } from './FormaPagoPicker'
import { ItemsEditor } from './ItemsEditor'
import { ZonaPicker } from './ZonaPicker'

const DEFAULTS = {
  rutaId: '',
  zona: 'URBANA',
  descripcion: '',
  numeroGuia: '',
  clienteId: '',
  guardarCliente: false,
  consentimientoCliente: false,
  items: [itemVacio()],
} as unknown as Partial<EnvioFormValues>

const conCliente = (c: Cliente) =>
  ({ ...DEFAULTS, clienteId: c.id, remitenteNombre: c.nombre, remitenteTelefono: c.telefono }) as Partial<EnvioFormValues>

/** Cliente frecuente elegido como remitente: se muestra como ficha para poder cambiarlo con un toque. */
function FichaCliente({ cliente, onQuitar }: { cliente: Cliente; onQuitar: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-accent/60 px-3 py-2 text-sm ring-1 ring-primary/30">
      <UserCheck className="size-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{cliente.nombre}</span>
        <span className="block truncate text-xs text-muted-foreground">
          Cliente frecuente · {cliente.envios} {cliente.envios === 1 ? 'envío' : 'envíos'}
        </span>
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={onQuitar}>
        <X />
        Cambiar
      </Button>
    </div>
  )
}

/**
 * Paso del formulario: región delimitada y numerada (región común + continuidad 1 → 4),
 * para leer el alta como un recorrido y no como una lista larga de campos.
 */
function Paso({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="space-y-4 rounded-xl p-4 ring-1 ring-foreground/10">
      <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
          {n}
        </span>
        {titulo}
      </p>
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

export function NuevoEnvioDialog({
  cliente,
  label = 'Nuevo envío',
  variant = 'default',
}: {
  /** Abre el formulario con este cliente como remitente. */
  cliente?: Cliente
  label?: string
  variant?: 'default' | 'outline'
} = {}) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { data: clientes = [] } = useClientes()
  const { data: tipos = TIPOS_CARGA_DEFAULT } = useTiposCarga()
  const { data: rutas = [] } = useRutas(true)
  const crear = useCrearEnvio()
  const schema = useMemo(() => crearEnvioSchema(tipos), [tipos])

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<EnvioFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    if (open) reset(cliente ? conCliente(cliente) : DEFAULTS)
  }, [open, cliente, reset])

  const [clienteId, remitenteTelefono, guardarCliente] = useWatch({
    control,
    name: ['clienteId', 'remitenteTelefono', 'guardarCliente'],
  })
  const elegido = clienteId ? clientes.find((c) => c.id === clienteId) : undefined
  // Sin cliente elegido: si el teléfono ya es de un cliente, el servidor lo asociará solo.
  const reconocido = !clienteId ? clientePorTelefono(clientes, remitenteTelefono ?? '') : undefined

  const elegirRemitente = (c: Cliente) => {
    setValue('clienteId', c.id)
    setValue('guardarCliente', false)
    setValue('consentimientoCliente', false)
    setValue('remitenteNombre', c.nombre, { shouldValidate: !!errors.remitenteNombre })
    setValue('remitenteTelefono', c.telefono, { shouldValidate: !!errors.remitenteTelefono })
  }
  const registrarRemitente = (texto: string) => {
    // Lo escrito puede ser el nombre o el teléfono del cliente nuevo.
    const esTelefono = digitos(texto).length >= 7 && /^[\d\s+-]+$/.test(texto)
    setValue(esTelefono ? 'remitenteTelefono' : 'remitenteNombre', texto)
    setValue('guardarCliente', true)
    setFocus(esTelefono ? 'remitenteNombre' : 'remitenteTelefono')
  }
  const quitarCliente = () => {
    setValue('clienteId', '')
    setValue('remitenteNombre', '')
    setValue('remitenteTelefono', '')
  }
  const elegirDestinatario = (c: Cliente) => {
    setValue('destinatarioNombre', c.nombre)
    setValue('destinatarioTelefono', c.telefono)
    if (c.direccion) setValue('destinatarioDireccion', c.direccion)
    if (!c.direccion) setFocus('destinatarioDireccion')
  }

  const [rutaId, items, zona] = useWatch({ control, name: ['rutaId', 'items', 'zona'] })
  // JSON estable: useWatch devuelve un array nuevo en cada render del field array.
  const itemsKey = JSON.stringify(itemsCotizables(items, tipos))
  const request = useMemo<CotizacionRequest | null>(() => {
    const validos = JSON.parse(itemsKey) as CotizacionRequest['items'] | null
    return rutaId && validos ? { rutaId: Number(rutaId), items: validos, zona: zona ?? 'URBANA' } : null
  }, [rutaId, itemsKey, zona])
  // La zona solo cambia el precio de algunos tipos (la tela): se avisa cuando el envío los lleva.
  const hayTipoPorZona = zonaInfluye((items ?? []).filter((i) => i?.tipoCarga), tipos)
  const cotizacionReq = useDebounced(request, 350)

  const rutaItems = Object.fromEntries(rutas.map((r) => [String(r.id), rutaLabel({ origen: r.origen.nombre, destino: r.destino.nombre })]))

  const onSubmit = async (values: EnvioFormValues) => {
    try {
      const envio = await crear.mutateAsync(toNuevoEnvio(values))
      toast.success(`Guía ${envio.numeroGuia} registrada`)
      if (values.guardarCliente && !values.clienteId) toast.success(`${values.remitenteNombre} quedó guardado como cliente`)
      qc.invalidateQueries({ queryKey: ['clientes'] })
      reset(DEFAULTS)
      setOpen(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={variant} />}>
        <Plus />
        {label}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo envío</DialogTitle>
          <DialogDescription>
            Registra la encomienda con el número de su guía física. Los datos del remitente y del destinatario se usan solo para este
            envío, según la política de privacidad.
          </DialogDescription>
        </DialogHeader>

        <form id="nuevo-envio" onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <Paso n={1} titulo="Remitente">
            {elegido ? (
              <FichaCliente cliente={elegido} onQuitar={quitarCliente} />
            ) : (
              clientes.length > 0 && (
                <ClienteBuscador
                  clientes={clientes}
                  onSelect={elegirRemitente}
                  onCrear={registrarRemitente}
                  label="Buscar cliente remitente"
                  placeholder="Cliente frecuente: busca por nombre o teléfono"
                />
              )
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Nombre" htmlFor="remitenteNombre" error={errors.remitenteNombre?.message}>
                <Input id="remitenteNombre" {...register('remitenteNombre')} />
              </Campo>
              <Campo label="Teléfono" htmlFor="remitenteTelefono" error={errors.remitenteTelefono?.message}>
                <Input id="remitenteTelefono" inputMode="tel" placeholder="0991234567" {...register('remitenteTelefono')} />
              </Campo>
            </div>
            {!elegido &&
              (reconocido ? (
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <UserCheck className="size-3.5 text-primary" />
                  Este teléfono es de <strong className="text-foreground">{reconocido.nombre}</strong>: el envío se suma a su historial.
                  <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => elegirRemitente(reconocido)}>
                    Usar sus datos
                  </button>
                </p>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ring-1 ring-foreground/10">
                  <span>
                    Guardar como cliente frecuente
                    <span className="block text-xs text-muted-foreground">La próxima vez lo encuentras escribiendo su nombre.</span>
                  </span>
                  <Controller
                    control={control}
                    name="guardarCliente"
                    render={({ field }) => (
                      <Switch aria-label="Guardar como cliente frecuente" checked={!!field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              ))}
            {!clienteId && guardarCliente && (
              <ConsentimientoDatos
                id="consentimientoCliente"
                error={errors.consentimientoCliente?.message}
                {...register('consentimientoCliente')}
              />
            )}
          </Paso>

          <Paso n={2} titulo="Destinatario">
            {clientes.length > 0 && (
              <ClienteBuscador
                clientes={clientes}
                onSelect={elegirDestinatario}
                label="Buscar cliente destinatario"
                placeholder="¿Es un cliente? Autocompleta sus datos"
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            <div className="space-y-1.5">
              <Label id="zona-label">Zona de entrega</Label>
              <Controller
                control={control}
                name="zona"
                render={({ field }) => (
                  <ZonaPicker value={field.value ?? 'URBANA'} onChange={field.onChange} describedBy="zona-ayuda" />
                )}
              />
              <p id="zona-ayuda" className="text-xs text-muted-foreground">
                {hayTipoPorZona
                  ? 'Este envío lleva tela: el rollo cuesta distinto en zona urbana y rural.'
                  : 'Solo cambia el precio de los rollos de tela.'}
              </p>
            </div>
          </Paso>

          <Paso n={3} titulo="Carga">
            <Campo label="N.º de guía (opcional)" htmlFor="numeroGuia" error={errors.numeroGuia?.message}>
              <Input id="numeroGuia" inputMode="numeric" autoComplete="off" placeholder="Ej. 0040425" className="font-mono" {...register('numeroGuia')} />
              {!errors.numeroGuia && (
                <p className="text-xs text-muted-foreground">Escribe el número impreso en la guía. Si lo dejas vacío, se asigna el siguiente.</p>
              )}
            </Campo>
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
                      {[...rutas]
                        .sort((x, y) => rutaItems[String(x.id)]!.localeCompare(rutaItems[String(y.id)]!, 'es'))
                        .map((r) => (
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
            <Campo label="Descripción (opcional)" htmlFor="descripcion" error={errors.descripcion?.message}>
              <Textarea id="descripcion" rows={1} placeholder="Documentos, ropa, repuestos…" {...register('descripcion')} />
            </Campo>
          </Paso>

          <Paso n={4} titulo="Pago">
            <Campo label="Forma de pago" error={errors.formaPago?.message}>
              <Controller
                control={control}
                name="formaPago"
                render={({ field }) => (
                  <FormaPagoPicker value={field.value} onChange={field.onChange} invalid={!!errors.formaPago} />
                )}
              />
            </Campo>
            <CotizacionPanel request={cotizacionReq} tipos={tipos} />
          </Paso>
        </form>

        {/* Acción principal siempre visible al desplazarse (punto focal) */}
        <DialogFooter className="sticky bottom-0 z-10 bg-popover/95 backdrop-blur">
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
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
