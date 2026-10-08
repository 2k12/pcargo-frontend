import { PackageOpen, Search } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { rutaLabel, useRutas } from '@/features/rutas/hooks'
import { useDebounced } from '@/hooks/useDebounced'
import { errorMessage } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Estado, FormaPago } from '@/types/api'
import { EnvioDetailSheet } from './components/EnvioDetailSheet'
import { EstadoBadge } from './components/EstadoBadge'
import { FormaPagoBadge } from './components/FormaPagoBadge'
import { NuevoEnvioDialog } from './components/NuevoEnvioDialog'
import { ESTADO_LABEL, ESTADOS, FORMA_PAGO_LABEL, FORMAS_PAGO, piezasLabel, resumenItems } from './domain'
import { useEnvios } from './hooks'

const TODOS = 'TODOS'

export function EnviosPage() {
  const [estado, setEstado] = useState<string>(TODOS)
  const [rutaId, setRutaId] = useState<string>(TODOS)
  const [formaPago, setFormaPago] = useState<string>(TODOS)
  const [busqueda, setBusqueda] = useState('')
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const q = useDebounced(busqueda.trim(), 300)

  const { data: rutas = [] } = useRutas()
  const { data: envios, isLoading, error } = useEnvios({
    estado: estado === TODOS ? undefined : (estado as Estado),
    rutaId: rutaId === TODOS ? undefined : Number(rutaId),
    formaPago: formaPago === TODOS ? undefined : (formaPago as FormaPago),
    q: q || undefined,
  })

  const estadoItems = { [TODOS]: 'Todos los estados', ...ESTADO_LABEL }
  const pagoItems = { [TODOS]: 'Todo pago', ...FORMA_PAGO_LABEL }
  const rutaItems: Record<string, string> = {
    [TODOS]: 'Todas las rutas',
    ...Object.fromEntries(rutas.map((r) => [String(r.id), rutaLabel({ origen: r.origen.nombre, destino: r.destino.nombre })])),
  }

  return (
    <>
      <PageHeader title="Envíos" description="Sobres, paquetes, cartones y valijas en circulación" actions={<NuevoEnvioDialog />} />

      <div className="flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por código, remitente o destinatario"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar envíos"
          />
        </div>
        <Select items={estadoItems} value={estado} onValueChange={(v) => setEstado(v ?? TODOS)}>
          <SelectTrigger className="w-full lg:w-40" aria-label="Filtrar por estado">
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
        <Select items={pagoItems} value={formaPago} onValueChange={(v) => setFormaPago(v ?? TODOS)}>
          <SelectTrigger className="w-full lg:w-36" aria-label="Filtrar por forma de pago">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todo pago</SelectItem>
            {FORMAS_PAGO.map((f) => (
              <SelectItem key={f} value={f}>
                {FORMA_PAGO_LABEL[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select items={rutaItems} value={rutaId} onValueChange={(v) => setRutaId(v ?? TODOS)}>
          <SelectTrigger className="w-full lg:w-52" aria-label="Filtrar por ruta">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(rutaItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="py-0">
        {error ? (
          <p className="p-6 text-sm text-destructive">{errorMessage(error)}</p>
        ) : isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !envios || envios.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <PackageOpen className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No hay envíos</p>
            <p className="text-sm text-muted-foreground">Ajusta los filtros o registra un nuevo envío.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Código</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead className="hidden md:table-cell">Ruta</TableHead>
                <TableHead className="hidden sm:table-cell">Carga</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Pago</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="hidden pr-4 text-right lg:table-cell">Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {envios.map((e) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => setSeleccionado(e.id)}>
                  <TableCell className="pl-4 font-mono text-xs">{e.codigo}</TableCell>
                  <TableCell>
                    <span className="block font-medium">{e.destinatario.nombre}</span>
                    <span className="block text-xs text-muted-foreground">de {e.remitente.nombre}</span>
                    <span className="block text-xs text-muted-foreground sm:hidden">{piezasLabel(e.totalPiezas)}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{rutaLabel(e.ruta)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="block max-w-56 truncate" title={resumenItems(e.items)}>
                      {resumenItems(e.items)}
                    </span>
                    <span className="block text-xs text-muted-foreground">{piezasLabel(e.totalPiezas)}</span>
                  </TableCell>
                  <TableCell>
                    <EstadoBadge estado={e.estado} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <FormaPagoBadge formaPago={e.formaPago} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(e.costo)}</TableCell>
                  <TableCell className="hidden pr-4 text-right lg:table-cell">
                    <span className="block text-muted-foreground">{formatDate(e.registro.fecha)}</span>
                    {e.registro.operador && (
                      <span className="block text-xs text-muted-foreground">{e.registro.operador}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <EnvioDetailSheet envioId={seleccionado} onClose={() => setSeleccionado(null)} />
    </>
  )
}
