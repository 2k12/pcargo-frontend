import { History } from 'lucide-react'
import { useState } from 'react'
import { Paginacion } from '@/components/Paginacion'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { nombreTipoCarga } from '@/features/envios/domain'
import { errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { AccionCambioTipoCarga } from '@/types/api'
import { ACCION_TIPO_LABEL, textoCambio } from '../domain'
import { useHistorialTipos, useTiposCargaTodos } from '../hooks'

const POR_PAGINA = 20
const TODOS = '__todos__'

const TONO_ACCION: Record<AccionCambioTipoCarga, 'secondary' | 'outline' | 'destructive'> = {
  CREADO: 'secondary',
  MODIFICADO: 'outline',
  ACTIVADO: 'secondary',
  DESACTIVADO: 'outline',
  ELIMINADO: 'destructive',
}

/** Pestaña «Historial de cambios»: quién cambió qué y cuándo, con los valores antes → después (contrato v11). */
export function HistorialTiposPanel() {
  const [codigo, setCodigo] = useState<string>(TODOS)
  const [pagina, setPagina] = useState(1)
  const { data: tipos = [] } = useTiposCargaTodos()
  const filtro = { codigo: codigo === TODOS ? undefined : codigo, pagina, porPagina: POR_PAGINA }
  const { data, isLoading, isFetching, error } = useHistorialTipos(filtro)

  const items: Record<string, string> = { [TODOS]: 'Todos los tipos', ...Object.fromEntries(tipos.map((t) => [t.codigo, t.nombre])) }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full space-y-1.5 sm:w-64">
          <Label id="historial-tipo-label">Tipo de carga</Label>
          <Select
            items={items}
            value={codigo}
            onValueChange={(v) => {
              setCodigo(v ?? TODOS)
              setPagina(1)
            }}
          >
            <SelectTrigger className="w-full" aria-labelledby="historial-tipo-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(items).map(([valor, etiqueta]) => (
                <SelectItem key={valor} value={valor}>
                  {etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <Card>
          <p className="px-4 text-sm text-destructive">{errorMessage(error)}</p>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : !data || data.datos.length === 0 ? (
        <Card className="items-center gap-2 py-12 text-center">
          <History aria-hidden="true" className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Sin cambios registrados</p>
          <p className="text-sm text-muted-foreground">Cada alta, cambio de precio, activación o eliminación aparecerá aquí.</p>
        </Card>
      ) : (
        <>
          <Card className="py-0">
            <Table aria-label="Historial de cambios de tipos de carga">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead className="pr-4">Cambios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.datos.map((c) => (
                  <TableRow key={c.id} className="align-top">
                    <TableCell className="pl-4 whitespace-nowrap text-muted-foreground">{formatDateTime(c.fecha)}</TableCell>
                    <TableCell>{c.usuario ?? '—'}</TableCell>
                    <TableCell>
                      <span className="block">{nombreTipoCarga(c.codigo, tipos)}</span>
                      <span className="font-mono text-xs text-muted-foreground">{c.codigo}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={TONO_ACCION[c.accion] ?? 'outline'}>{ACCION_TIPO_LABEL[c.accion] ?? c.accion}</Badge>
                    </TableCell>
                    <TableCell className="min-w-56 pr-4 whitespace-normal">
                      {c.cambios.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <ul className="space-y-0.5 tabular-nums">
                          {c.cambios.map((x) => (
                            <li key={x.campo}>{textoCambio(x)}</li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Paginacion
            pagina={data.pagina}
            porPagina={data.porPagina}
            total={data.total}
            totalPaginas={data.totalPaginas}
            onPagina={setPagina}
            cargando={isFetching}
          />
        </>
      )}
    </div>
  )
}
