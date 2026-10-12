import { Activity, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { BotonCopiar } from '@/components/BotonCopiar'
import { Paginacion } from '@/components/Paginacion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useSolicitudesApi } from '../hooks'
import { StatusHttp } from './WebhookPanel'

/** Auditoría de la API (90 días): nunca guarda la key ni el body. */
export function ActividadPanel({ integracionId }: { integracionId: string }) {
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(20)
  const { data, isLoading, error, isPlaceholderData, refetch, isFetching } = useSolicitudesApi(integracionId, { pagina, porPagina })

  return (
    <section className="space-y-3" aria-label="Actividad de la API">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Cada solicitud a la API queda registrada 90 días (sin la key ni el body).</p>
        <Button variant="ghost" size="icon" aria-label="Actualizar actividad" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn(isFetching && 'animate-spin')} />
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive">{errorMessage(error)}</p>
      ) : isLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : !data || data.datos.length === 0 ? (
        <Card className="items-center gap-2 py-10 text-center">
          <Activity className="size-7 text-muted-foreground" />
          <p className="text-sm font-medium">Sin actividad</p>
          <p className="text-sm text-muted-foreground">Aquí aparecerán las solicitudes de la empresa.</p>
        </Card>
      ) : (
        <Card className="py-0">
          <Table aria-label="Solicitudes a la API">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Fecha</TableHead>
                <TableHead>Solicitud</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">IP</TableHead>
                <TableHead className="hidden lg:table-cell">Key</TableHead>
                <TableHead className="hidden md:table-cell">Referencia</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Duración</TableHead>
                <TableHead className="pr-4">Request id</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.datos.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="pl-4 text-xs whitespace-nowrap">{formatDateTime(s.fecha)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <span className="font-semibold">{s.metodo}</span> {s.ruta}
                  </TableCell>
                  <TableCell>
                    <StatusHttp status={s.status} />
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">{s.ip}</TableCell>
                  <TableCell className="hidden font-mono text-xs lg:table-cell">{s.keyPrefijo ?? '—'}</TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">{s.referenciaExterna ?? '—'}</TableCell>
                  <TableCell className="hidden text-right text-xs tabular-nums sm:table-cell">{s.duracionMs} ms</TableCell>
                  <TableCell className="pr-4">
                    <span className="flex items-center gap-1">
                      <span className="max-w-24 truncate font-mono text-xs" title={s.requestId}>
                        {s.requestId}
                      </span>
                      <BotonCopiar valor={s.requestId} etiqueta={`Copiar request id ${s.requestId}`} />
                    </span>
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
