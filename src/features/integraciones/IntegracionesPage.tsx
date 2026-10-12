import { ChevronRight, Plug, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errorMessage } from '@/lib/api'
import { INTERACTIVA, SUPERFICIE } from '@/lib/estilos'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Integracion } from '@/types/api'
import { IntegracionFormDialog } from './components/IntegracionFormDialog'
import { useIntegraciones } from './hooks'

export function EstadoIntegracionBadge({ activa }: { activa: boolean }) {
  return <Badge variant={activa ? 'secondary' : 'outline'}>{activa ? 'Activa' : 'Inactiva'}</Badge>
}

const enviosLabel = (n: number) => `${n} ${n === 1 ? 'envío' : 'envíos'}`

function TarjetaIntegracion({ i }: { i: Integracion }) {
  return (
    <Link to={`/integraciones/${i.id}`} className={cn('flex flex-col gap-2 p-3 text-sm', SUPERFICIE, INTERACTIVA, !i.activa && 'opacity-70')}>
      <span className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">{i.nombre}</span>
        <EstadoIntegracionBadge activa={i.activa} />
      </span>
      <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>Desde {i.ciudadOrigen}</span>
        <span>{enviosLabel(i.envios)}</span>
        <span>{i.ultimoEnvio ? `Último: ${formatDate(i.ultimoEnvio)}` : 'Sin envíos aún'}</span>
        <span>{i.webhook ? 'Con webhook' : 'Sin webhook'}</span>
      </span>
    </Link>
  )
}

/** Empresas que ingresan envíos por la API (solo ADMIN). */
export function IntegracionesPage() {
  const { data: integraciones, isLoading, error } = useIntegraciones()
  const [creando, setCreando] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        title="Integraciones"
        description="Empresas que registran sus envíos desde su propio sistema, con API keys y webhooks"
        actions={
          <Button onClick={() => setCreando(true)}>
            <Plus />
            Nueva integración
          </Button>
        }
      />

      {error ? (
        <Card>
          <p className="px-4 text-sm text-destructive">{errorMessage(error)}</p>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl md:h-10" />
          ))}
        </div>
      ) : !integraciones || integraciones.length === 0 ? (
        <Card className="items-center gap-2 py-16 text-center">
          <Plug className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Aún no hay integraciones</p>
          <p className="max-w-md px-4 text-sm text-muted-foreground">
            Crea una para que una tienda en línea o un distribuidor ingrese sus pedidos de envío directamente desde su sistema.
          </p>
          <Button variant="outline" className="mt-2" onClick={() => setCreando(true)}>
            <Plus />
            Nueva integración
          </Button>
        </Card>
      ) : (
        <>
          <ul className="grid gap-2 sm:grid-cols-2 md:hidden" aria-label="Integraciones">
            {integraciones.map((i) => (
              <li key={i.id}>
                <TarjetaIntegracion i={i} />
              </li>
            ))}
          </ul>
          <Card className="hidden py-0 md:flex">
            <Table aria-label="Integraciones">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Nombre</TableHead>
                  <TableHead>Ciudad de origen</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Envíos</TableHead>
                  <TableHead>Último envío</TableHead>
                  <TableHead>Webhook</TableHead>
                  <TableHead className="pr-4">
                    <span className="sr-only">Abrir</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integraciones.map((i) => (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => navigate(`/integraciones/${i.id}`)}>
                    <TableCell className="pl-4 font-medium">
                      <Link to={`/integraciones/${i.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {i.nombre}
                      </Link>
                    </TableCell>
                    <TableCell>{i.ciudadOrigen}</TableCell>
                    <TableCell>
                      <EstadoIntegracionBadge activa={i.activa} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{i.envios}</TableCell>
                    <TableCell className="text-muted-foreground">{i.ultimoEnvio ? formatDate(i.ultimoEnvio) : '—'}</TableCell>
                    <TableCell>
                      {i.webhook ? (
                        <Badge variant={i.webhook.activo ? 'secondary' : 'outline'}>{i.webhook.activo ? 'Sí' : 'Pausado'}</Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <IntegracionFormDialog open={creando} onOpenChange={setCreando} onGuardada={(i) => navigate(`/integraciones/${i.id}`)} />
    </>
  )
}
