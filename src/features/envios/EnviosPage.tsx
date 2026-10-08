import { PackageOpen, Search, UserRound, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { CampoFiltro, FiltrosMovil } from '@/components/FiltrosMovil'
import { PageHeader } from '@/components/layout/PageHeader'
import { Paginacion } from '@/components/Paginacion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useClientes } from '@/features/clientes/api'
import { rutaLabel, useRutas } from '@/features/rutas/hooks'
import { useDebounced } from '@/hooks/useDebounced'
import { useEsMovil } from '@/hooks/useMediaQuery'
import { errorMessage } from '@/lib/api'
import { OPCIONES_POR_PAGINA } from '@/lib/paginacion'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Estado, FormaPago } from '@/types/api'
import { EnvioCard } from './components/EnvioCard'
import { EnvioDetailSheet } from './components/EnvioDetailSheet'
import { EstadoBadge } from './components/EstadoBadge'
import { FormaPagoBadge } from './components/FormaPagoBadge'
import { NuevoEnvioDialog } from './components/NuevoEnvioDialog'
import { ESTADO_LABEL, ESTADOS, FORMA_PAGO_LABEL, FORMAS_PAGO, piezasLabel, resumenItems } from './domain'
import { useEnvios } from './hooks'

const TODOS = 'TODOS'
const POR_PAGINA_DEFECTO = 20

/** Lee un entero positivo de la URL; si falta o no es válido usa el valor por defecto. */
const enteroPositivo = (valor: string | null, defecto: number) => {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : defecto
}

export function EnviosPage() {
  // Los filtros viven en la URL: el resumen enlaza a /envios?estado=… y se pueden compartir.
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') ?? TODOS
  const rutaId = params.get('rutaId') ?? TODOS
  const formaPago = params.get('formaPago') ?? TODOS
  // La página también vive en la URL (se puede compartir y "Atrás" vuelve a la anterior).
  const pagina = enteroPositivo(params.get('pagina'), 1)
  const porPaginaUrl = enteroPositivo(params.get('porPagina'), POR_PAGINA_DEFECTO)
  const porPagina = (OPCIONES_POR_PAGINA as readonly number[]).includes(porPaginaUrl) ? porPaginaUrl : POR_PAGINA_DEFECTO
  const irAPagina = (n: number, opciones: { replace?: boolean } = {}) =>
    setParams(
      (p) => {
        if (n <= 1) p.delete('pagina')
        else p.set('pagina', String(n))
        return p
      },
      opciones,
    )
  const setPorPagina = (n: number) =>
    setParams(
      (p) => {
        p.delete('pagina')
        if (n === POR_PAGINA_DEFECTO) p.delete('porPagina')
        else p.set('porPagina', String(n))
        return p
      },
      { replace: true },
    )
  // Cambiar un filtro vuelve a la primera página: la página actual podría no existir con el filtro nuevo.
  const setFiltro = (clave: string) => (v: string | null) =>
    setParams(
      (p) => {
        if (!v || v === TODOS) p.delete(clave)
        else p.set(clave, v)
        p.delete('pagina')
        return p
      },
      { replace: true },
    )
  const setEstado = setFiltro('estado')
  const setRutaId = setFiltro('rutaId')
  const setFormaPago = setFiltro('formaPago')
  // Filtro por cliente: llega desde el resumen o la ficha del cliente (?clienteId=).
  const clienteId = params.get('clienteId') ?? undefined
  const { data: clientes = [] } = useClientes()
  const clienteFiltro = clienteId ? clientes.find((c) => c.id === clienteId) : undefined
  const [busqueda, setBusqueda] = useState('')
  const hayFiltros = estado !== TODOS || rutaId !== TODOS || formaPago !== TODOS || !!clienteId || busqueda !== ''
  const limpiar = () => {
    setBusqueda('')
    setParams({}, { replace: true })
  }
  // Filtros de la hoja móvil: estado, pago y ruta (la búsqueda y el cliente tienen su propio control).
  const filtrosHoja = [estado, formaPago, rutaId].filter((v) => v !== TODOS).length
  const limpiarHoja = () =>
    setParams(
      (p) => {
        for (const clave of ['estado', 'formaPago', 'rutaId', 'pagina']) p.delete(clave)
        return p
      },
      { replace: true },
    )
  const esMovil = useEsMovil()
  /** En móvil cada control va con su etiqueta dentro de la hoja; en escritorio, en línea. */
  const campo = (label: string, control: ReactNode) => (esMovil ? <CampoFiltro label={label}>{control}</CampoFiltro> : control)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const q = useDebounced(busqueda.trim(), 300)

  const { data: rutas = [] } = useRutas()
  const {
    data: resultado,
    isLoading,
    isPlaceholderData,
    error,
  } = useEnvios({
    estado: estado === TODOS ? undefined : (estado as Estado),
    rutaId: rutaId === TODOS ? undefined : Number(rutaId),
    formaPago: formaPago === TODOS ? undefined : (formaPago as FormaPago),
    clienteId,
    q: q || undefined,
    pagina,
    porPagina,
  })
  const envios = resultado?.datos

  // Si la página pedida ya no existe (p. ej. se cancelaron envíos o la URL es vieja), ir a la última.
  const totalPaginas = resultado?.totalPaginas ?? 0
  useEffect(() => {
    if (isPlaceholderData || totalPaginas === 0 || pagina <= totalPaginas) return
    setParams(
      (p) => {
        if (totalPaginas <= 1) p.delete('pagina')
        else p.set('pagina', String(totalPaginas))
        return p
      },
      { replace: true },
    )
  }, [isPlaceholderData, totalPaginas, pagina, setParams])

  const estadoItems = { [TODOS]: 'Todos los estados', ...ESTADO_LABEL }
  const pagoItems = { [TODOS]: 'Todo pago', ...FORMA_PAGO_LABEL }
  // Arreglo ordenado: un objeto pondría las claves numéricas ("1", "2"…) antes de TODOS.
  const opcionesRuta = rutas
    .map((r) => ({ value: String(r.id), label: rutaLabel({ origen: r.origen.nombre, destino: r.destino.nombre }) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
  const rutaItems: Record<string, string> = {
    [TODOS]: 'Todas las rutas',
    ...Object.fromEntries(opcionesRuta.map((o) => [o.value, o.label])),
  }

  const controles = (
    <>
      {campo(
        'Estado',
        <Select items={estadoItems} value={estado} onValueChange={(v) => setEstado(v)}>
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
        </Select>,
      )}
      {campo(
        'Forma de pago',
        <Select items={pagoItems} value={formaPago} onValueChange={(v) => setFormaPago(v)}>
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
        </Select>,
      )}
      {campo(
        'Ruta',
        <Select items={rutaItems} value={rutaId} onValueChange={(v) => setRutaId(v)}>
          <SelectTrigger className="col-span-2 w-full sm:col-span-1 lg:w-52" aria-label="Filtrar por ruta">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas las rutas</SelectItem>
            {opcionesRuta.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      )}
    </>
  )

  return (
    <>
      <PageHeader title="Envíos" description="Sobres, paquetes, cartones y valijas en circulación" actions={<NuevoEnvioDialog />} />

      {/* Móvil: buscador + botón «Filtros» que abre una hoja inferior. Escritorio: todo en línea. */}
      <div className={esMovil ? 'flex gap-2' : 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex'}>
        <div className={esMovil ? 'relative min-w-0 flex-1' : 'relative col-span-2 sm:col-span-3 lg:flex-1'}>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por N.º de guía, remitente o destinatario"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              // Una búsqueda nueva empieza en la primera página.
              if (pagina > 1) irAPagina(1, { replace: true })
            }}
            aria-label="Buscar envíos"
          />
        </div>
        {esMovil ? (
          <FiltrosMovil activos={filtrosHoja} onLimpiar={limpiarHoja} descripcion="Estado, forma de pago y ruta">
            {controles}
          </FiltrosMovil>
        ) : (
          controles
        )}
      </div>

      <div className="-mt-2 flex min-h-8 items-center justify-between gap-2 text-xs text-muted-foreground md:-mt-4">
        <span className="flex min-w-0 items-center gap-2" aria-live="polite">
          {resultado ? `${resultado.total} ${resultado.total === 1 ? 'envío' : 'envíos'}` : ''}
          {clienteId && (
            <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-accent px-2 py-0.5 font-medium text-accent-foreground">
              <UserRound className="size-3.5 shrink-0" />
              <span className="truncate">{clienteFiltro?.nombre ?? 'Cliente'}</span>
              <button
                type="button"
                aria-label="Quitar filtro de cliente"
                className="rounded hover:text-foreground"
                onClick={() => setFiltro('clienteId')(null)}
              >
                <X className="size-3.5" />
              </button>
            </span>
          )}
        </span>
        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiar}>
            <X />
            Limpiar filtros
          </Button>
        )}
      </div>

      {error ? (
        <Card>
          <p className="px-4 text-sm text-destructive">{errorMessage(error)}</p>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl md:h-10" />
          ))}
        </div>
      ) : !envios || envios.length === 0 ? (
        <Card className="items-center gap-2 py-16 text-center">
          <PackageOpen className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">No hay envíos</p>
          <p className="text-sm text-muted-foreground">Ajusta los filtros o registra un nuevo envío.</p>
        </Card>
      ) : (
        <>
          <ul className="grid gap-2 sm:grid-cols-2 md:hidden" aria-label="Lista de envíos">
            {envios.map((e) => (
              <li key={e.id}>
                <EnvioCard envio={e} onSelect={setSeleccionado} />
              </li>
            ))}
          </ul>
          <Card className="hidden py-0 md:flex">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Guía</TableHead>
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
                    <TableCell className="pl-4 font-mono text-xs">{e.numeroGuia}</TableCell>
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
          </Card>
        </>
      )}

      {resultado && resultado.total > 0 && (
        <Paginacion
          pagina={resultado.pagina}
          porPagina={resultado.porPagina}
          total={resultado.total}
          totalPaginas={resultado.totalPaginas}
          onPagina={(n) => {
            irAPagina(n)
            window.scrollTo?.({ top: 0, behavior: 'smooth' })
          }}
          onPorPagina={setPorPagina}
          cargando={isPlaceholderData}
        />
      )}

      <EnvioDetailSheet envioId={seleccionado} onClose={() => setSeleccionado(null)} />
    </>
  )
}
