import { ArrowLeft, Pencil } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FormaPagoBadge } from '@/features/envios/components/FormaPagoBadge'
import { errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { ActividadPanel } from './components/ActividadPanel'
import { ApiKeysPanel } from './components/ApiKeysPanel'
import { ComoIntegrarse } from './components/ComoIntegrarse'
import { IntegracionFormDialog } from './components/IntegracionFormDialog'
import { WebhookPanel } from './components/WebhookPanel'
import { useActualizarIntegracion, useIntegracion } from './hooks'
import { EstadoIntegracionBadge } from './IntegracionesPage'

const PESTANAS = [
  { value: 'keys', label: 'API keys' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'actividad', label: 'Actividad' },
  { value: 'guia', label: 'Cómo integrarse' },
] as const
type Pestana = (typeof PESTANAS)[number]['value']
const esPestana = (v: string | null): v is Pestana => PESTANAS.some((p) => p.value === v)

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  )
}

export function IntegracionDetallePage() {
  const { id } = useParams()
  const { data: integracion, isLoading, error } = useIntegracion(id)
  const actualizar = useActualizarIntegracion()
  const [editando, setEditando] = useState(false)
  // La pestaña vive en la URL (?tab=) para poder enlazarla y volver con "Atrás".
  const [params, setParams] = useSearchParams()
  const tab: Pestana = esPestana(params.get('tab')) ? (params.get('tab') as Pestana) : 'keys'

  const volver = (
    <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/integraciones" />} className="-ml-2 w-fit">
      <ArrowLeft />
      Integraciones
    </Button>
  )

  if (error) {
    return (
      <>
        {volver}
        <Card>
          <p className="px-4 text-sm text-destructive">{errorMessage(error)}</p>
        </Card>
      </>
    )
  }
  if (isLoading || !integracion) {
    return (
      <div className="space-y-4">
        {volver}
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  const alternarActiva = (activa: boolean) =>
    actualizar.mutate(
      { id: integracion.id, cambios: { activa } },
      {
        onSuccess: () => toast.success(activa ? 'Integración activada' : 'Integración desactivada: sus keys se rechazan'),
        onError: (e) => toast.error(errorMessage(e)),
      },
    )

  return (
    <>
      <div className="space-y-2">
        {volver}
        <PageHeader
          title={integracion.nombre}
          description={`Creada el ${formatDate(integracion.creadaEn)} · ${integracion.envios} ${integracion.envios === 1 ? 'envío' : 'envíos'}`}
          actions={
            <Button variant="outline" onClick={() => setEditando(true)}>
              <Pencil />
              Editar
            </Button>
          }
        />
      </div>

      <Card className="gap-4 px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <EstadoIntegracionBadge activa={integracion.activa} />
          <div className="flex items-center gap-2">
            <Switch
              id="detalle-activa"
              checked={integracion.activa}
              disabled={actualizar.isPending}
              onCheckedChange={alternarActiva}
            />
            <label htmlFor="detalle-activa" className="text-sm">
              Integración activa
            </label>
          </div>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dato etiqueta="Remitente">
            {integracion.remitente.nombre}
            <span className="block text-xs text-muted-foreground">
              {integracion.remitente.telefono} · {integracion.remitente.direccion}
            </span>
          </Dato>
          <Dato etiqueta="Ciudad de origen">{integracion.ciudadOrigen}</Dato>
          <Dato etiqueta="Forma de pago por defecto">
            <FormaPagoBadge formaPago={integracion.formaPagoPorDefecto} />
          </Dato>
          <Dato etiqueta="IPs permitidas">
            {integracion.ipsPermitidas.length === 0 ? (
              <span className="text-muted-foreground">Cualquier IP</span>
            ) : (
              <span className="font-mono text-xs">{integracion.ipsPermitidas.join(', ')}</span>
            )}
          </Dato>
        </dl>
      </Card>

      <Tabs
        value={tab}
        onValueChange={(v) =>
          setParams(
            (p) => {
              if (v === 'keys') p.delete('tab')
              else p.set('tab', String(v))
              return p
            },
            { replace: true },
          )
        }
      >
        <div className="-mx-4 relative overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList>
            {PESTANAS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="keys" className="pt-2">
          <ApiKeysPanel integracion={integracion} />
        </TabsContent>
        <TabsContent value="webhook" className="pt-2">
          <WebhookPanel integracion={integracion} />
        </TabsContent>
        <TabsContent value="actividad" className="pt-2">
          <ActividadPanel integracionId={integracion.id} />
        </TabsContent>
        <TabsContent value="guia" className="pt-2">
          <ComoIntegrarse integracion={integracion} />
        </TabsContent>
      </Tabs>

      <IntegracionFormDialog open={editando} onOpenChange={setEditando} integracion={integracion} />
    </>
  )
}
