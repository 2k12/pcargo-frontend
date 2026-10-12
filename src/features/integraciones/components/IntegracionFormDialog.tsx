import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, UserRound, X } from 'lucide-react'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useClientes } from '@/features/clientes/api'
import { ClienteBuscador } from '@/features/clientes/components/ClienteBuscador'
import { FORMA_PAGO_LABEL, FORMAS_PAGO } from '@/features/envios/domain'
import { useCiudades } from '@/features/rutas/hooks'
import { errorMessage } from '@/lib/api'
import type { DatosIntegracion, FormaPago, Integracion } from '@/types/api'
import { esIpOCidr } from '../domain'
import { useActualizarIntegracion, useCrearIntegracion } from '../hooks'

const schema = z.object({
  nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
  remitenteNombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(120, 'Máximo 120 caracteres'),
  remitenteTelefono: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,15}$/, 'Teléfono inválido'),
  remitenteDireccion: z.string().trim().min(1, 'La dirección de recogida es obligatoria').max(200, 'Máximo 200 caracteres'),
  ciudadOrigenId: z.string().min(1, 'Elige la ciudad de origen'),
  formaPagoPorDefecto: z.enum(['PAGADO', 'AL_COBRO', 'CONTRATO', 'SEGURO']),
  clienteId: z.string().nullable(),
  ipsPermitidas: z.array(z.string().refine(esIpOCidr, 'IP o rango CIDR inválido')),
  activa: z.boolean(),
})
type Values = z.infer<typeof schema>

const VACIO: Values = {
  nombre: '',
  remitenteNombre: '',
  remitenteTelefono: '',
  remitenteDireccion: '',
  ciudadOrigenId: '',
  formaPagoPorDefecto: 'CONTRATO',
  clienteId: null,
  ipsPermitidas: [],
  activa: true,
}

function valoresDe(i: Integracion): Values {
  return {
    nombre: i.nombre,
    remitenteNombre: i.remitente.nombre,
    remitenteTelefono: i.remitente.telefono,
    remitenteDireccion: i.remitente.direccion,
    ciudadOrigenId: String(i.ciudadOrigenId),
    formaPagoPorDefecto: i.formaPagoPorDefecto,
    clienteId: i.clienteId,
    ipsPermitidas: i.ipsPermitidas,
    activa: i.activa,
  }
}

function aDatos(v: Values): DatosIntegracion {
  return {
    nombre: v.nombre.trim(),
    activa: v.activa,
    remitente: { nombre: v.remitenteNombre.trim(), telefono: v.remitenteTelefono.trim(), direccion: v.remitenteDireccion.trim() },
    ciudadOrigenId: Number(v.ciudadOrigenId),
    formaPagoPorDefecto: v.formaPagoPorDefecto,
    clienteId: v.clienteId,
    ipsPermitidas: v.ipsPermitidas,
  }
}

/** Lista editable de IPs/CIDR: se agrega con Enter o con el botón; cada una se quita con su ×. */
function IpsEditor({ value, onChange }: { value: string[]; onChange: (ips: string[]) => void }) {
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const agregar = () => {
    const ip = texto.trim()
    if (!ip) return
    if (!esIpOCidr(ip)) return setError('Escribe una IPv4, IPv6 o un rango CIDR (p. ej. 203.0.113.0/24)')
    if (value.includes(ip)) return setError('Esa IP ya está en la lista')
    onChange([...value, ip])
    setTexto('')
    setError(null)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      agregar()
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id="int-ip"
          value={texto}
          placeholder="203.0.113.10 o 203.0.113.0/24"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? 'int-ip-ayuda int-ip-error' : 'int-ip-ayuda'}
          onChange={(e) => {
            setTexto(e.target.value)
            setError(null)
          }}
          onKeyDown={onKeyDown}
        />
        <Button type="button" variant="outline" onClick={agregar}>
          Agregar
        </Button>
      </div>
      {error && (
        <p id="int-ip-error" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <p id="int-ip-ayuda" className="text-xs text-muted-foreground">
        {value.length === 0 ? 'Sin IPs: se acepta cualquier IP (la key sigue siendo obligatoria).' : 'Solo se aceptan solicitudes desde estas IPs.'}
      </p>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="IPs permitidas">
          {value.map((ip) => (
            <li key={ip} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
              {ip}
              <button
                type="button"
                aria-label={`Quitar ${ip}`}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                onClick={() => onChange(value.filter((x) => x !== ip))}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Alta o edición de una integración (empresa que ingresa envíos por API). */
export function IntegracionFormDialog({
  open,
  onOpenChange,
  integracion,
  onGuardada,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  integracion?: Integracion | null
  onGuardada?: (i: Integracion) => void
}) {
  const crear = useCrearIntegracion()
  const actualizar = useActualizarIntegracion()
  const pendiente = crear.isPending || actualizar.isPending
  const { data: ciudades = [] } = useCiudades()
  const { data: clientes = [] } = useClientes()
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: VACIO })

  useEffect(() => {
    if (open) reset(integracion ? valoresDe(integracion) : VACIO)
  }, [open, integracion, reset])

  // Solo ciudades activas; la actual se conserva aunque se haya desactivado después.
  const opcionesCiudad = ciudades.filter((c) => c.activa || c.id === integracion?.ciudadOrigenId)
  const ciudadItems = Object.fromEntries(opcionesCiudad.map((c) => [String(c.id), c.activa ? c.nombre : `${c.nombre} (inactiva)`]))
  const pagoItems = FORMA_PAGO_LABEL as Record<string, string>

  const onSubmit = async (v: Values) => {
    try {
      const datos = aDatos(v)
      const guardada = integracion
        ? await actualizar.mutateAsync({ id: integracion.id, cambios: datos })
        : await crear.mutateAsync(datos)
      toast.success(integracion ? 'Integración actualizada' : `Integración «${guardada.nombre}» creada`)
      onGuardada?.(guardada)
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const campoError = (msg?: string) => msg && <p className="text-xs text-destructive">{msg}</p>

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{integracion ? 'Editar integración' : 'Nueva integración'}</DialogTitle>
          <DialogDescription>
            Todos los envíos que la empresa ingrese por la API salen a nombre de este remitente y desde la ciudad de origen.
          </DialogDescription>
        </DialogHeader>
        <form id="integracion-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="int-nombre">Nombre de la empresa</Label>
            <Input id="int-nombre" autoComplete="off" aria-invalid={!!errors.nombre} {...register('nombre')} />
            {campoError(errors.nombre?.message)}
          </div>

          <fieldset className="grid gap-4 rounded-xl p-3 ring-1 ring-foreground/10 sm:col-span-2 sm:grid-cols-2">
            <legend className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Remitente fijo</legend>
            <div className="space-y-1.5">
              <Label htmlFor="int-rem-nombre">Nombre</Label>
              <Input id="int-rem-nombre" autoComplete="off" aria-invalid={!!errors.remitenteNombre} {...register('remitenteNombre')} />
              {campoError(errors.remitenteNombre?.message)}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="int-rem-telefono">Teléfono</Label>
              <Input
                id="int-rem-telefono"
                inputMode="tel"
                autoComplete="off"
                placeholder="0991234567"
                aria-invalid={!!errors.remitenteTelefono}
                {...register('remitenteTelefono')}
              />
              {campoError(errors.remitenteTelefono?.message)}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="int-rem-direccion">Dirección de recogida</Label>
              <Input
                id="int-rem-direccion"
                autoComplete="off"
                placeholder="Calle, número, referencia"
                aria-invalid={!!errors.remitenteDireccion}
                {...register('remitenteDireccion')}
              />
              {campoError(errors.remitenteDireccion?.message)}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label id="int-ciudad-label">Ciudad de origen</Label>
            <Controller
              control={control}
              name="ciudadOrigenId"
              render={({ field }) => (
                <Select items={ciudadItems} value={field.value || null} onValueChange={(v) => field.onChange(v ?? '')}>
                  <SelectTrigger className="w-full" aria-labelledby="int-ciudad-label" aria-invalid={!!errors.ciudadOrigenId}>
                    <SelectValue placeholder="Ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    {opcionesCiudad.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {ciudadItems[String(c.id)]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {campoError(errors.ciudadOrigenId?.message)}
          </div>

          <div className="space-y-1.5">
            <Label id="int-pago-label">Forma de pago por defecto</Label>
            <Controller
              control={control}
              name="formaPagoPorDefecto"
              render={({ field }) => (
                <Select items={pagoItems} value={field.value} onValueChange={(v) => v && field.onChange(v as FormaPago)}>
                  <SelectTrigger className="w-full" aria-labelledby="int-pago-label">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGO.map((f) => (
                      <SelectItem key={f} value={f}>
                        {FORMA_PAGO_LABEL[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Cliente frecuente (opcional)</Label>
            <Controller
              control={control}
              name="clienteId"
              render={({ field }) => {
                const cliente = field.value ? clientes.find((c) => c.id === field.value) : undefined
                return field.value ? (
                  <span className="flex h-8 items-center gap-2 rounded-lg bg-accent px-2.5 text-sm text-accent-foreground">
                    <UserRound className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate">{cliente?.nombre ?? 'Cliente'}</span>
                    <button
                      type="button"
                      aria-label="Quitar cliente"
                      className="rounded hover:text-foreground"
                      onClick={() => field.onChange(null)}
                    >
                      <X className="size-4" />
                    </button>
                  </span>
                ) : (
                  <ClienteBuscador
                    clientes={clientes}
                    onSelect={(c) => field.onChange(c.id)}
                    label="Cliente frecuente de la integración"
                    placeholder="Buscar cliente por nombre o teléfono"
                  />
                )
              }}
            />
            <p className="text-xs text-muted-foreground">Si no eliges uno, se asocia por el teléfono del remitente.</p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="int-ip">IPs permitidas</Label>
            <Controller
              control={control}
              name="ipsPermitidas"
              render={({ field }) => <IpsEditor value={field.value} onChange={field.onChange} />}
            />
            {campoError(errors.ipsPermitidas?.message)}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl p-3 ring-1 ring-foreground/10 sm:col-span-2">
            <div className="space-y-0.5">
              <Label htmlFor="int-activa">Integración activa</Label>
              <p className="text-xs text-muted-foreground">Desactivada, todas sus keys se rechazan (403).</p>
            </div>
            <Controller
              control={control}
              name="activa"
              render={({ field }) => <Switch id="int-activa" checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="integracion-form" disabled={pendiente}>
            {pendiente ? <Loader2 className="animate-spin" /> : !integracion && <Plus />}
            {integracion ? 'Guardar cambios' : 'Crear integración'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
