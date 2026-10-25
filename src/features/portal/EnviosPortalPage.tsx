import { PackageOpen, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Paginacion } from '@/components/Paginacion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EstadoPunto } from '@/features/envios/components/EstadoBadge'
import { ESTADO_LABEL, ESTADOS, FORMA_PAGO_LABEL, piezasLabel } from '@/features/envios/domain'
import { rutaLabel } from '@/features/rutas/hooks'
import { useDebounced } from '@/hooks/useDebounced'
import { useEsMovil } from '@/hooks/useMediaQuery'
import { errorMessage } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Estado } from '@/types/api'
import { EnvioPortalSheet } from './components/EnvioPortalSheet'
import { useEnviosPortal } from './hooks'

const TODOS = 'TODOS'
const POR_PAGINA = 20

export function EnviosPortalPage() {
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') ?? TODOS
  const seleccionado = params.get('envio')
  const [pagina, setPagina] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const q = useDebounced(busqueda.trim(), 300)
  const esMovil = useEsMovil()
  const { data, isLoading, isPlaceholderData, error } = useEnviosPortal({
    estado: estado === TODOS ? undefined : (estado as Estado),
    q: q || undefined,
    pagina,
    porPagina: POR_PAGINA,
  })
  const envios = data?.datos ?? []
  const hayFiltros = estado !== TODOS || !!busqueda

  const setParam = (clave: string, valor: string | null) =>
    setParams(
      (p) => {
        if (!valor || valor === TODOS) p.delete(clave)
        else p.set(clave, valor)
        return p
      },
      { replace: true },
    )
  const estadoItems = { [TODOS]: 'Todos los estados', ...ESTADO_LABEL }

  return (
    <>
      <PageHeader
        title="Envíos"
        description={data ? `${data.total} ${data.total === 1 ? 'envío' : 'envíos'}` : undefined}
        actions={
          <Button nativeButton={false} render={<Link to="/portal/nuevo" />}>
            <Plus />
            Nuevo envío
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar guía, destinatario o pedido"
            aria-label="Buscar envíos"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setPagina(1)
            }}
          />
        </div>
        <Select
          items={estadoItems}
          value={estado}
          onValueChange={(v) => {
            setParam('estado', v)
            setPagina(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-48" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los estados</SelectItem>
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>
                {ESTADO_LABEL[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p className="py-10 text-center text-sm text-destructive">{errorMessage(error)}</p>
      ) : isLoading ? (
        <div className="divide-y">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex gap-4 py-3.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : envios.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-24 text-center">
          <PackageOpen className="mb-2 size-6 text-muted-foreground/60" strokeWidth={1.5} />
          <p className="text-sm font-medium">No hay envíos</p>
          <p className="text-sm text-muted-foreground">{hayFiltros ? 'Prueba con otros filtros.' : 'Crea el primero con «Nuevo envío».'}</p>
        </div>
      ) : esMovil ? (
        <ul className="-mx-4 divide-y border-y" aria-label="Lista de envíos">
          {envios.map((e) => (
            <li key={e.id}>
              <button type="button" className="w-full px-4 py-3 text-left" onClick={() => setParam('envio', e.id)}>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium">{e.destinatario.nombre}</span>
                  <span className="shrink-0 text-sm tabular-nums">{formatCurrency(e.costo)}</span>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="truncate">
                    <span className="font-mono">{e.numeroGuia}</span> · {rutaLabel(e.ruta)}
                  </span>
                  <span>{formatDate(e.creadoEn)}</span>
                </span>
                <EstadoPunto estado={e.estado} className="mt-1.5 text-xs" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-normal text-muted-foreground">Guía</TableHead>
              <TableHead className="text-xs font-normal text-muted-foreground">Destinatario</TableHead>
              <TableHead className="text-xs font-normal text-muted-foreground">Estado</TableHead>
              <TableHead className="text-right text-xs font-normal text-muted-foreground">Costo</TableHead>
              <TableHead className="hidden text-right text-xs font-normal text-muted-foreground lg:table-cell">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {envios.map((e) => (
              <TableRow key={e.id} className="cursor-pointer" onClick={() => setParam('envio', e.id)}>
                <TableCell className="py-3 font-mono tabular-nums">{e.numeroGuia}</TableCell>
                <TableCell className="max-w-72 py-3">
                  <span className="block truncate font-medium">{e.destinatario.nombre}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {rutaLabel(e.ruta)} · {piezasLabel(e.totalPiezas)}
                  </span>
                </TableCell>
                <TableCell className="py-3">
                  <EstadoPunto estado={e.estado} />
                  {e.evidencia?.recibidoPor && <span className="block text-xs text-muted-foreground">Recibió {e.evidencia.recibidoPor}</span>}
                </TableCell>
                <TableCell className="py-3 text-right">
                  <span className="block tabular-nums">{formatCurrency(e.costo)}</span>
                  <span className="block text-xs text-muted-foreground">{FORMA_PAGO_LABEL[e.formaPago]}</span>
                </TableCell>
                <TableCell className="hidden py-3 text-right text-muted-foreground tabular-nums lg:table-cell">{formatDate(e.creadoEn)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.total > 0 && (
        <Paginacion
          pagina={data.pagina}
          porPagina={data.porPagina}
          total={data.total}
          totalPaginas={data.totalPaginas}
          onPagina={(n) => {
            setPagina(n)
            window.scrollTo?.({ top: 0, behavior: 'smooth' })
          }}
          cargando={isPlaceholderData}
        />
      )}
      <EnvioPortalSheet envioId={seleccionado} onClose={() => setParam('envio', null)} />
    </>
  )
}
