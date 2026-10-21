import { CircleCheck, Receipt } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { Paginacion } from '@/components/Paginacion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useEsAdmin } from '@/features/auth/hooks'
import { esFecha } from '@/features/dashboard/domain'
import { useRepartidores, useUsuarios } from '@/features/usuarios/hooks'
import { useEsMovil } from '@/hooks/useMediaQuery'
import { errorMessage } from '@/lib/api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CajaPendiente } from '@/types/api'
import { CerrarCajaDialog } from './components/CerrarCajaDialog'
import { CierreDetalleSheet } from './components/CierreDetalleSheet'
import { PendienteCard } from './components/PendienteCard'
import { round2, sentidoDiferencia, textoDiferencia, TONO_DIFERENCIA } from './domain'
import { useCierres, usePendientes } from './hooks'

const TODOS = 'TODOS'
const POR_PAGINA = 20

/**
 * Personas para filtrar el historial: las que tienen pendientes, los repartidores y, para el ADMIN,
 * todo el personal (el OPERADOR no puede listar usuarios; se completa con quienes aparecen en los cierres).
 */
function usePersonas(extra: { id: string; nombre: string }[]) {
  const esAdmin = useEsAdmin()
  const { data: usuarios = [] } = useUsuarios(esAdmin)
  const { data: repartidores = [] } = useRepartidores()
  const mapa = new Map<string, string>()
  for (const p of [...usuarios.filter((u) => u.rol !== 'CLIENTE'), ...repartidores, ...extra]) mapa.set(p.id, p.nombre)
  return [...mapa].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

function Pendientes({ onCerrar }: { onCerrar: (p: CajaPendiente) => void }) {
  const { data: pendientes = [], isLoading, error } = usePendientes()
  const total = round2(pendientes.reduce((s, p) => s + p.total, 0))
  return (
    <section className="space-y-3" aria-label="Por entregar">
      <SectionLabel as="h2" aside={pendientes.length > 0 ? <span className="tabular-nums">{formatCurrency(total)} en total</span> : undefined}>
        Por entregar
      </SectionLabel>
      {error ? (
        <p className="py-6 text-sm text-destructive">{errorMessage(error)}</p>
      ) : isLoading ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </ul>
      ) : pendientes.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-5 text-sm">
          <CircleCheck className="size-5 text-brand-green-text" />
          <span>
            <span className="block font-medium">Todo entregado</span>
            <span className="text-muted-foreground">Nadie tiene cobros pendientes de entregar.</span>
          </span>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pendientes.map((p) => (
            <PendienteCard key={p.usuario.id} pendiente={p} onCerrar={() => onCerrar(p)} />
          ))}
        </ul>
      )}
    </section>
  )
}

function Historial() {
  const esMovil = useEsMovil()
  const [persona, setPersona] = useState(TODOS)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(1)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const rangoValido = (!desde || esFecha(desde)) && (!hasta || esFecha(hasta)) && (!desde || !hasta || desde <= hasta)
  const { data, isLoading, isPlaceholderData, error } = useCierres({
    usuarioId: persona === TODOS ? undefined : persona,
    desde: rangoValido && desde ? desde : undefined,
    hasta: rangoValido && hasta ? hasta : undefined,
    pagina,
    porPagina: POR_PAGINA,
  })
  const cierres = data?.datos ?? []
  const personas = usePersonas(cierres.map((c) => c.usuario))
  const personaItems = { [TODOS]: 'Todas las personas', ...Object.fromEntries(personas.map((p) => [p.id, p.nombre])) }
  const hayFiltros = persona !== TODOS || !!desde || !!hasta
  const filtrar = (fn: () => void) => {
    fn()
    setPagina(1)
  }

  return (
    <section className="space-y-3" aria-label="Cierres">
      <SectionLabel as="h2">Cierres</SectionLabel>
      <div className="flex flex-wrap items-end gap-2">
        <Select items={personaItems} value={persona} onValueChange={(v) => filtrar(() => setPersona(v ?? TODOS))}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar por persona">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas las personas</SelectItem>
            {personas.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Input
            type="date"
            aria-label="Desde"
            className="w-full min-w-0 sm:w-40"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => filtrar(() => setDesde(e.target.value))}
          />
          <Input
            type="date"
            aria-label="Hasta"
            className="w-full min-w-0 sm:w-40"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => filtrar(() => setHasta(e.target.value))}
          />
        </div>
        {hayFiltros && (
          <Button
            variant="link"
            size="sm"
            className="px-1 text-muted-foreground"
            onClick={() =>
              filtrar(() => {
                setPersona(TODOS)
                setDesde('')
                setHasta('')
              })
            }
          >
            Limpiar filtros
          </Button>
        )}
      </div>
      {!rangoValido && <p className="text-xs text-destructive">«Desde» no puede ser posterior a «Hasta».</p>}

      {error ? (
        <p className="py-10 text-center text-sm text-destructive">{errorMessage(error)}</p>
      ) : isLoading ? (
        <div className="divide-y">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex gap-4 py-3.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : cierres.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-16 text-center">
          <Receipt className="mb-2 size-6 text-muted-foreground/60" strokeWidth={1.5} />
          <p className="text-sm font-medium">Sin cierres</p>
          <p className="text-sm text-muted-foreground">{hayFiltros ? 'Prueba con otros filtros.' : 'Aquí verás cada entrega de efectivo.'}</p>
        </div>
      ) : esMovil ? (
        <ul className="-mx-4 divide-y border-y" aria-label="Lista de cierres">
          {cierres.map((c) => (
            <li key={c.id}>
              <button type="button" className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left" onClick={() => setSeleccionado(c.id)}>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.usuario.nombre}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatDateTime(c.fecha)} · recibió {c.recibidoPor.nombre}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block tabular-nums">{formatCurrency(c.entregado)}</span>
                  <span className={cn('block text-xs', TONO_DIFERENCIA[sentidoDiferencia(c.diferencia)])}>{textoDiferencia(c.diferencia)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-normal text-muted-foreground">Fecha</TableHead>
              <TableHead className="text-xs font-normal text-muted-foreground">Entregó</TableHead>
              <TableHead className="hidden text-xs font-normal text-muted-foreground lg:table-cell">Recibió</TableHead>
              <TableHead className="text-right text-xs font-normal text-muted-foreground">Esperado</TableHead>
              <TableHead className="text-right text-xs font-normal text-muted-foreground">Entregado</TableHead>
              <TableHead className="text-right text-xs font-normal text-muted-foreground">Diferencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cierres.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => setSeleccionado(c.id)}>
                <TableCell className="py-3 text-muted-foreground tabular-nums">{formatDateTime(c.fecha)}</TableCell>
                <TableCell className="py-3">
                  <span className="block font-medium">{c.usuario.nombre}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.cantidad} {c.cantidad === 1 ? 'cobro' : 'cobros'}
                  </span>
                </TableCell>
                <TableCell className="hidden py-3 text-muted-foreground lg:table-cell">{c.recibidoPor.nombre}</TableCell>
                <TableCell className="py-3 text-right text-muted-foreground tabular-nums">{formatCurrency(c.esperado)}</TableCell>
                <TableCell className="py-3 text-right tabular-nums">{formatCurrency(c.entregado)}</TableCell>
                <TableCell className={cn('py-3 text-right tabular-nums', TONO_DIFERENCIA[sentidoDiferencia(c.diferencia)])}>
                  {textoDiferencia(c.diferencia)}
                </TableCell>
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
          onPagina={setPagina}
          cargando={isPlaceholderData}
        />
      )}
      <CierreDetalleSheet cierreId={seleccionado} onClose={() => setSeleccionado(null)} />
    </section>
  )
}

export function CajaPage() {
  const [aCerrar, setACerrar] = useState<CajaPendiente | null>(null)
  return (
    <>
      <PageHeader title="Caja" description="Efectivo que cada persona cobró y debe entregar" />
      <Pendientes onCerrar={setACerrar} />
      <Historial />
      <CerrarCajaDialog pendiente={aCerrar} onClose={() => setACerrar(null)} />
    </>
  )
}
