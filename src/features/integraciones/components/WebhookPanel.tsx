import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, RefreshCw, RotateCw, Send, Trash2, Webhook } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Paginacion } from '@/components/Paginacion'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ENTREGA_WEBHOOK_TONO, tonoStatusHttp } from '@/features/envios/ui'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { EntregaWebhook, EstadoEntregaWebhook, EventoWebhook, Integracion } from '@/types/api'
import { ESTADO_ENTREGA_LABEL, ESTADOS_ENTREGA, EVENTOS_WEBHOOK } from '../domain'
import {
  useEliminarWebhook,
  useEntregasWebhook,
  useGuardarWebhook,
  useProbarWebhook,
  useReintentarEntrega,
  useRotarSecreto,
} from '../hooks'
import { Confirmar } from './Confirmar'
import { SecretoUnaVez } from './SecretoUnaVez'

const webhookSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Escribe la URL')
    .max(2000, 'URL demasiado larga')
    .refine((u) => {
      try {
        const p = new URL(u)
        return p.protocol === 'https:' || p.protocol === 'http:'
      } catch {
        return false
      }
    }, 'URL inválida: debe empezar con https://'),
  eventos: z.array(z.enum(['envio.creado', 'envio.estado_actualizado', 'envio.evidencia_registrada'])).min(1, 'Elige al menos un evento'),
  activo: z.boolean(),
})
type WebhookValues = z.infer<typeof webhookSchema>

const TODOS = 'TODOS'

export function EstadoEntregaBadge({ estado }: { estado: EstadoEntregaWebhook }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', ENTREGA_WEBHOOK_TONO[estado])}>
      {ESTADO_ENTREGA_LABEL[estado]}
    </span>
  )
}

export function StatusHttp({ status }: { status: number | null }) {
  return (
    <span className={cn('inline-flex rounded-md px-1.5 py-0.5 font-mono text-xs tabular-nums', tonoStatusHttp(status))}>
      {status ?? '—'}
    </span>
  )
}

/** Resultado del último "Enviar evento de prueba". */
function ResultadoPrueba({ entrega }: { entrega: EntregaWebhook }) {
  const ok = entrega.estado === 'ENTREGADO'
  return (
    <div role="status" className="space-y-1 rounded-lg p-3 text-sm ring-1 ring-foreground/10">
      <p className="flex flex-wrap items-center gap-2 font-medium">
        {ok ? 'La URL respondió correctamente' : 'La URL no aceptó el evento'}
        <StatusHttp status={entrega.ultimoStatus} />
        <EstadoEntregaBadge estado={entrega.estado} />
      </p>
      {entrega.ultimoError && <p className="text-xs break-words text-destructive">{entrega.ultimoError}</p>}
    </div>
  )
}

function EntregasTabla({ integracionId }: { integracionId: string }) {
  const [estado, setEstado] = useState<string>(TODOS)
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)
  const filtro = { estado: estado === TODOS ? undefined : (estado as EstadoEntregaWebhook), pagina, porPagina }
  const { data, isLoading, error, isPlaceholderData, refetch, isFetching } = useEntregasWebhook(integracionId, filtro)
  const reintentar = useReintentarEntrega(integracionId)
  const items: Record<string, string> = { [TODOS]: 'Todos los estados', ...ESTADO_ENTREGA_LABEL }

  const onReintentar = async (e: EntregaWebhook) => {
    try {
      const r = await reintentar.mutateAsync(e.id)
      toast.success(r.estado === 'ENTREGADO' ? 'Entrega reintentada: entregada' : 'Reintento programado')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <section className="space-y-3" aria-label="Entregas del webhook">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionLabel as="h3">Entregas</SectionLabel>
        <div className="flex items-center gap-2">
          <Select
            items={items}
            value={estado}
            onValueChange={(v) => {
              setEstado(v ?? TODOS)
              setPagina(1)
            }}
          >
            <SelectTrigger className="w-44" aria-label="Filtrar entregas por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los estados</SelectItem>
              {ESTADOS_ENTREGA.map((e) => (
                <SelectItem key={e} value={e}>
                  {ESTADO_ENTREGA_LABEL[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" aria-label="Actualizar entregas" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn(isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{errorMessage(error)}</p>
      ) : isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : !data || data.datos.length === 0 ? (
        <Card className="py-8 text-center text-sm text-muted-foreground">
          <p>Sin entregas{estado !== TODOS ? ' con ese estado' : ' todavía'}.</p>
        </Card>
      ) : (
        <Card className="py-0">
          <Table aria-label="Entregas del webhook">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Evento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden sm:table-cell">Intentos</TableHead>
                <TableHead>Último status</TableHead>
                <TableHead className="hidden lg:table-cell">Próximo intento</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.datos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="pl-4">
                    <span className="block font-mono text-xs">{e.evento}</span>
                    <span className="block text-xs text-muted-foreground">
                      {e.numeroGuia ? `Guía ${e.numeroGuia} · ` : ''}
                      {formatDateTime(e.creadoEn)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <EstadoEntregaBadge estado={e.estado} />
                  </TableCell>
                  <TableCell className="hidden tabular-nums sm:table-cell">{e.intentos}</TableCell>
                  <TableCell className="max-w-64">
                    <StatusHttp status={e.ultimoStatus} />
                    {e.ultimoError && (
                      <span className="block truncate text-xs text-muted-foreground" title={e.ultimoError}>
                        {e.ultimoError}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{e.proximoIntentoEn ? formatDateTime(e.proximoIntentoEn) : '—'}</TableCell>
                  <TableCell className="pr-4 text-right">
                    {e.estado === 'FALLIDO' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reintentar.isPending && reintentar.variables === e.id}
                        onClick={() => onReintentar(e)}
                        aria-label={`Reintentar entrega ${e.evento}${e.numeroGuia ? ` de la guía ${e.numeroGuia}` : ''}`}
                      >
                        <RotateCw />
                        Reintentar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {data && data.total > 0 && (
        <Paginacion
          pagina={data.pagina}
          porPagina={data.porPagina}
          total={data.total}
          totalPaginas={data.totalPaginas}
          onPagina={setPagina}
          onPorPagina={(n) => {
            setPorPagina(n)
            setPagina(1)
          }}
          cargando={isPlaceholderData}
        />
      )}
    </section>
  )
}

/** Configuración del webhook (Standard Webhooks), prueba, rotación del secreto y entregas. */
export function WebhookPanel({ integracion }: { integracion: Integracion }) {
  const webhook = integracion.webhook
  const guardar = useGuardarWebhook(integracion.id)
  const rotar = useRotarSecreto(integracion.id)
  const eliminar = useEliminarWebhook(integracion.id)
  const probar = useProbarWebhook(integracion.id)
  const [secreto, setSecreto] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<'rotar' | 'eliminar' | null>(null)
  const [prueba, setPrueba] = useState<EntregaWebhook | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<WebhookValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: webhook
      ? { url: webhook.url, eventos: webhook.eventos, activo: webhook.activo }
      : { url: '', eventos: ['envio.creado', 'envio.estado_actualizado', 'envio.evidencia_registrada'], activo: true },
  })

  useEffect(() => {
    if (webhook) reset({ url: webhook.url, eventos: webhook.eventos, activo: webhook.activo })
  }, [webhook, reset])

  const onSubmit = async (v: WebhookValues) => {
    try {
      const r = await guardar.mutateAsync({ url: v.url.trim(), eventos: v.eventos, activo: v.activo })
      toast.success(webhook ? 'Webhook actualizado' : 'Webhook configurado')
      if (r.secreto) setSecreto(r.secreto)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const onRotar = async () => {
    try {
      const r = await rotar.mutateAsync()
      setConfirmar(null)
      setSecreto(r.secreto)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const onEliminar = async () => {
    try {
      await eliminar.mutateAsync()
      setConfirmar(null)
      setPrueba(null)
      reset({ url: '', eventos: ['envio.creado', 'envio.estado_actualizado', 'envio.evidencia_registrada'], activo: true })
      toast.success('Webhook eliminado')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const onProbar = async () => {
    try {
      setPrueba(await probar.mutateAsync())
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <section className="space-y-6" aria-label="Webhook">
      <Card className="gap-4 px-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-0.5">
            <p className="flex items-center gap-2 font-medium">
              <Webhook className="size-4 text-muted-foreground" />
              {webhook ? 'Webhook configurado' : 'Sin webhook'}
            </p>
            <p className="text-xs text-muted-foreground">
              {webhook ? (
                <>
                  Secreto: <span className="font-mono">{webhook.secretoPrefijo}…</span> · firma HMAC-SHA256 (Standard Webhooks)
                </>
              ) : (
                'PCargo avisará a la empresa por HTTP POST cada vez que cambie uno de sus envíos.'
              )}
            </p>
          </div>
        </div>

        <form id="webhook-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="webhook-url">URL</Label>
            <Input
              id="webhook-url"
              type="url"
              inputMode="url"
              placeholder="https://tienda.example/webhooks/pcargo"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!errors.url}
              aria-describedby="webhook-url-ayuda"
              {...register('url')}
            />
            <p id="webhook-url-ayuda" className="text-xs text-muted-foreground">
              Debe ser https://. No se siguen redirecciones y debe responder 2xx en menos de 10 s.
            </p>
            {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
          </div>
          <Controller
            control={control}
            name="eventos"
            render={({ field }) => (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Eventos</legend>
                {EVENTOS_WEBHOOK.map((ev) => {
                  const id = `webhook-evento-${ev.value.replace(/\./g, '-')}`
                  return (
                    <div key={ev.value} className="flex items-start gap-2.5">
                      <Checkbox
                        id={id}
                        className="mt-0.5"
                        checked={field.value.includes(ev.value)}
                        onCheckedChange={(c) =>
                          field.onChange(c ? [...field.value, ev.value] : field.value.filter((x: EventoWebhook) => x !== ev.value))
                        }
                      />
                      <div className="grid gap-0.5">
                        <Label htmlFor={id}>{ev.label}</Label>
                        <span className="text-xs text-muted-foreground">
                          <span className="font-mono">{ev.value}</span> · {ev.descripcion}
                        </span>
                      </div>
                    </div>
                  )
                })}
                {errors.eventos && <p className="text-xs text-destructive">{errors.eventos.message}</p>}
              </fieldset>
            )}
          />
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="activo"
              render={({ field }) => <Switch id="webhook-activo" checked={field.value} onCheckedChange={field.onChange} />}
            />
            <Label htmlFor="webhook-activo">Webhook activo</Label>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button type="submit" form="webhook-form" disabled={guardar.isPending || (!!webhook && !isDirty)}>
            {guardar.isPending && <Loader2 className="animate-spin" />}
            {webhook ? 'Guardar cambios' : 'Guardar webhook'}
          </Button>
          {webhook && (
            <>
              <Button variant="outline" onClick={onProbar} disabled={probar.isPending}>
                {probar.isPending ? <Loader2 className="animate-spin" /> : <Send />}
                Enviar evento de prueba
              </Button>
              <Button variant="outline" onClick={() => setConfirmar('rotar')}>
                <RotateCw />
                Rotar secreto
              </Button>
              <Button variant="ghost" className="text-destructive hover:text-destructive sm:ml-auto" onClick={() => setConfirmar('eliminar')}>
                <Trash2 />
                Eliminar webhook
              </Button>
            </>
          )}
        </div>
        {prueba && <ResultadoPrueba entrega={prueba} />}
      </Card>

      {webhook && <EntregasTabla integracionId={integracion.id} />}

      <SecretoUnaVez
        valor={secreto}
        titulo="Secreto del webhook"
        descripcion="La empresa lo necesita para verificar la cabecera webhook-signature de cada evento."
        onCerrar={() => setSecreto(null)}
      />
      <Confirmar
        abierto={confirmar === 'rotar'}
        onCancelar={() => setConfirmar(null)}
        onConfirmar={onRotar}
        pendiente={rotar.isPending}
        titulo="¿Rotar el secreto?"
        descripcion="Se genera un secreto nuevo y el anterior deja de firmar los eventos. La empresa debe actualizarlo en su servidor para seguir verificando las firmas."
        accion="Rotar secreto"
      />
      <Confirmar
        abierto={confirmar === 'eliminar'}
        onCancelar={() => setConfirmar(null)}
        onConfirmar={onEliminar}
        pendiente={eliminar.isPending}
        titulo="¿Eliminar el webhook?"
        descripcion="La empresa dejará de recibir avisos de sus envíos. Podrás configurarlo de nuevo (con un secreto nuevo)."
        accion="Eliminar webhook"
      />
    </section>
  )
}
