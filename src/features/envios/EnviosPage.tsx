import { PackageOpen, Search, UserRound, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { CampoFiltro, FiltrosMovil } from '@/components/FiltrosMovil'
import { PageHeader } from '@/components/layout/PageHeader'
import { Paginacion } from '@/components/Paginacion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { cn } from '@/lib/utils'
import type { Envio, Estado, FormaPago } from '@/types/api'
import { ConEvidencia } from './components/ConEvidencia'
import { EnvioDetailSheet } from './components/EnvioDetailSheet'
import { EstadoPunto } from './components/EstadoBadge'
import { NuevoEnvioDialog } from './components/NuevoEnvioDialog'
import { OrigenBadge } from './components/OrigenBadge'
import { SeleccionGuias } from './components/SeleccionGuias'
import { ESTADO_LABEL, ESTADOS, FORMA_PAGO_LABEL, FORMAS_PAGO, piezasLabel, resumenItems } from './domain'
import { useEnvios, useOpcionesIntegracion } from './hooks'
import { ImportarEnviosDialog } from './importacion/ImportarEnviosDialog'

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
  // Origen (contrato v10): Panel o API; con API se puede elegir además una integración.
  const integracionId = params.get('integracionId') ?? undefined
  const canalUrl = params.get('canal')
  const canal = canalUrl === 'PANEL' || canalUrl === 'API' ? canalUrl : integracionId ? 'API' : TODOS
  const setCanal = (v: string | null) =>
    setParams(
      (p) => {
        if (!v || v === TODOS) p.delete('canal')
        else p.set('canal', v)
        if (v !== 'API') p.delete('integracionId')
        p.delete('pagina')
        return p
      },
      { replace: true },
    )
  const setIntegracion = (v: string | null) =>
    setParams(
      (p) => {
        if (!v || v === TODOS) p.delete('integracionId')
        else p.set('integracionId', v)
        p.set('canal', 'API')
        p.delete('pagina')
        return p
      },
      { replace: true },
    )
  const opcionesIntegracion = useOpcionesIntegracion(canal === 'API')
  // Filtro por cliente: llega desde el resumen o la ficha del cliente (?clienteId=).
  const clienteId = params.get('clienteId') ?? undefined
  const { data: clientes = [] } = useClientes()
  const clienteFiltro = clienteId ? clientes.find((c) => c.id === clienteId) : undefined
  const [busqueda, setBusqueda] = useState('')
  const hayFiltros =
    estado !== TODOS || rutaId !== TODOS || formaPago !== TODOS || canal !== TODOS || !!clienteId || busqueda !== ''
  const limpiar = () => {
    setBusqueda('')
    setParams({}, { replace: true })
  }
  // Filtros de la hoja móvil: estado, pago, ruta y origen (la búsqueda y el cliente tienen su propio control).
  const filtrosHoja = [estado, formaPago, rutaId, canal].filter((v) => v !== TODOS).length + (integracionId ? 1 : 0)
  const limpiarHoja = () =>
    setParams(
      (p) => {
        for (const clave of ['estado', 'formaPago', 'rutaId', 'canal', 'integracionId', 'pagina']) p.delete(clave)
        return p
      },
      { replace: true },
    )
  const esMovil = useEsMovil()
  /** En móvil cada control va con su etiqueta dentro de la hoja; en escritorio, en línea. */
  const campo = (label: string, control: ReactNode) => (esMovil ? <CampoFiltro label={label}>{control}</CampoFiltro> : control)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  // Envíos marcados para imprimir sus guías juntas; se conservan al cambiar de página o de filtro.
  const [marcados, setMarcados] = useState<Map<string, Envio>>(() => new Map())
  const alternarMarcado = (e: Envio) =>
    setMarcados((prev) => {
      const sig = new Map(prev)
      if (sig.has(e.id)) sig.delete(e.id)
      else sig.set(e.id, e)
      return sig
    })
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
    canal: canal === TODOS ? undefined : canal,
    integracionId: canal === 'API' ? integracionId : undefined,
    q: q || undefined,
    pagina,
    porPagina,
  })
  const envios = resultado?.datos
  const marcadosEnPagina = envios?.filter((e) => marcados.has(e.id)).length ?? 0
  const paginaMarcada = !!envios?.length && marcadosEnPagina === envios.length
  const marcarPagina = (marcar: boolean) =>
    setMarcados((prev) => {
      const sig = new Map(prev)
      for (const e of envios ?? []) {
        if (marcar) sig.set(e.id, e)
        else sig.delete(e.id)
      }
      return sig
    })

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
  const pagoItems = { [TODOS]: 'Pago', ...FORMA_PAGO_LABEL }
  // Arreglo ordenado: un objeto pondría las claves numéricas ("1", "2"…) antes de TODOS.
  const opcionesRuta = rutas
    .map((r) => ({ value: String(r.id), label: rutaLabel({ origen: r.origen.nombre, destino: r.destino.nombre }) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
  const rutaItems: Record<string, string> = {
    [TODOS]: 'Ruta',
    ...Object.fromEntries(opcionesRuta.map((o) => [o.value, o.label])),
  }

  const canalItems: Record<string, string> = { [TODOS]: 'Origen', PANEL: 'Panel', API: 'API' }
  // La integración de la URL se conserva aunque aún no estén las opciones (o un OPERADOR no la vea en la lista).
  const integracionesFiltro =
    integracionId && !opcionesIntegracion.some((o) => o.id === integracionId)
      ? [...opcionesIntegracion, { id: integracionId, nombre: 'Integración seleccionada' }]
      : opcionesIntegracion
  const integracionItems: Record<string, string> = {
    [TODOS]: 'Integración',
    ...Object.fromEntries(integracionesFiltro.map((o) => [o.id, o.nombre])),
  }

  /**
   * En escritorio los filtros secundarios son texto silencioso (sin borde) que solo toma peso cuando
   * filtra algo; en la hoja móvil, controles normales a ancho completo.
   */
  const trigger = (activo: boolean) =>
    esMovil
      ? 'w-full'
      : cn(
          'h-8 border-transparent bg-transparent px-2.5 shadow-none hover:bg-muted dark:bg-transparent',
          activo ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground',
        )

  const filtroEstado = (
    <Select items={estadoItems} value={estado} onValueChange={(v) => setEstado(v)}>
      <SelectTrigger className="w-full" aria-label="Filtrar por estado">
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
  )

  const filtrosSecundarios = (
    <>
      {campo(
        'Forma de pago',
        <Select items={pagoItems} value={formaPago} onValueChange={(v) => setFormaPago(v)}>
          <SelectTrigger className={trigger(formaPago !== TODOS)} aria-label="Filtrar por forma de pago">
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
          <SelectTrigger className={trigger(rutaId !== TODOS)} aria-label="Filtrar por ruta">
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
      {campo(
        'Origen',
        <Select items={canalItems} value={canal} onValueChange={(v) => setCanal(v)}>
          <SelectTrigger className={trigger(canal !== TODOS)} aria-label="Filtrar por origen">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todo origen</SelectItem>
            <SelectItem value="PANEL">Panel</SelectItem>
            <SelectItem value="API">API</SelectItem>
          </SelectContent>
        </Select>,
      )}
      {canal === 'API' &&
        campo(
          'Integración',
          <Select items={integracionItems} value={integracionId ?? TODOS} onValueChange={(v) => setIntegracion(v)}>
            <SelectTrigger className={trigger(!!integracionId)} aria-label="Filtrar por integración">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas las integraciones</SelectItem>
              {integracionesFiltro.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
        )}
    </>
  )

  const hayMarcados = marcados.size > 0
  /** Casillas discretas: aparecen al pasar sobre la fila y quedan fijas en cuanto hay una selección. */
  const casilla = cn(
    'transition-opacity focus-visible:opacity-100',
    hayMarcados ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover/tabla:opacity-100',
  )
  const total = resultado?.total

  return (
    <>
      <PageHeader
        title="Envíos"
        actions={
          <>
            <ImportarEnviosDialog />
            <NuevoEnvioDialog />
          </>
        }
      />

      <div className="space-y-3">
        {/* Estado: el filtro principal, como pestañas de texto (escritorio). */}
        {!esMovil && (
          <div role="group" aria-label="Estado" className="-mx-1 flex gap-1 overflow-x-auto border-b">
            {[TODOS, ...ESTADOS].map((e) => {
              const activo = estado === e
              return (
                <button
                  key={e}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setEstado(e)}
                  className={cn(
                    '-mb-px shrink-0 border-b-2 px-2.5 pt-1 pb-2.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                    activo ? 'border-foreground font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {e === TODOS ? 'Todos' : ESTADO_LABEL[e as Estado]}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className={esMovil ? 'relative min-w-0 flex-1' : 'relative w-full max-w-sm'}>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar guía, cliente o pedido"
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
            <FiltrosMovil activos={filtrosHoja} onLimpiar={limpiarHoja} descripcion="Estado, forma de pago, ruta y origen">
              {campo('Estado', filtroEstado)}
              {filtrosSecundarios}
            </FiltrosMovil>
          ) : (
            <div className="flex items-center gap-0.5">{filtrosSecundarios}</div>
          )}
          {clienteId && (
            <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-muted py-1 pr-1 pl-2 text-xs font-medium">
              <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="max-w-32 truncate">{clienteFiltro?.nombre ?? 'Cliente'}</span>
              <button
                type="button"
                aria-label="Quitar filtro de cliente"
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                onClick={() => setFiltro('clienteId')(null)}
              >
                <X className="size-3.5" />
              </button>
            </span>
          )}
          {hayFiltros && !esMovil && (
            <Button variant="link" size="sm" className="px-1 text-muted-foreground" onClick={limpiar}>
              Limpiar filtros
            </Button>
          )}
          {!esMovil && (
            <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums" aria-live="polite">
              {total !== undefined ? `${total} ${total === 1 ? 'envío' : 'envíos'}` : ''}
            </span>
          )}
        </div>
        {esMovil && (hayFiltros || total !== undefined) && (
          <div className="flex min-h-7 items-center justify-between text-xs text-muted-foreground" aria-live="polite">
            <span className="tabular-nums">{total !== undefined ? `${total} ${total === 1 ? 'envío' : 'envíos'}` : ''}</span>
            {hayFiltros && (
              <Button variant="link" size="sm" className="h-auto px-0 text-muted-foreground" onClick={limpiar}>
                Limpiar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {error ? (
        <p className="py-10 text-center text-sm text-destructive">{errorMessage(error)}</p>
      ) : isLoading ? (
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : !envios || envios.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-24 text-center">
          <PackageOpen className="mb-2 size-6 text-muted-foreground/60" strokeWidth={1.5} />
          <p className="text-sm font-medium">No hay envíos</p>
          <p className="text-sm text-muted-foreground">{hayFiltros ? 'Prueba con otros filtros.' : 'Registra el primero con «Nuevo envío».'}</p>
        </div>
      ) : (
        esMovil ? (
          /* Móvil: lista plana con separadores finos; la casilla a la izquierda, el resto abre el detalle. */
          <ul className="-mx-4 divide-y border-y" aria-label="Lista de envíos">
            {envios.map((e) => (
              <li key={e.id} className={cn('flex items-start gap-3 px-4 py-3', marcados.has(e.id) && 'bg-muted/60')}>
                <Checkbox
                  className="mt-0.5"
                  checked={marcados.has(e.id)}
                  onCheckedChange={() => alternarMarcado(e)}
                  aria-label={`Seleccionar guía ${e.numeroGuia}`}
                />
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSeleccionado(e.id)}>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium">{e.destinatario.nombre}</span>
                    <span className="shrink-0 text-sm tabular-nums">{formatCurrency(e.costo)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="truncate">
                      <span className="font-mono">{e.numeroGuia}</span> · {rutaLabel(e.ruta)}
                    </span>
                    <PagoTexto formaPago={e.formaPago} />
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <EstadoPunto estado={e.estado} className="text-xs" />
                    <ConEvidencia envio={e} />
                    <OrigenBadge origen={e.origen} ocultarPanel className="max-w-40" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Table className="group/tabla">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 pr-0">
                  <Checkbox
                    className={casilla}
                    checked={paginaMarcada}
                    indeterminate={marcadosEnPagina > 0 && !paginaMarcada}
                    onCheckedChange={(c) => marcarPagina(c)}
                    aria-label="Seleccionar todos los envíos de la página"
                  />
                </TableHead>
                <TableHead className="text-xs font-normal text-muted-foreground">Guía</TableHead>
                <TableHead className="text-xs font-normal text-muted-foreground">Destinatario</TableHead>
                <TableHead className="hidden text-xs font-normal text-muted-foreground lg:table-cell">Ruta</TableHead>
                <TableHead className="text-xs font-normal text-muted-foreground">Estado</TableHead>
                <TableHead className="text-right text-xs font-normal text-muted-foreground">Costo</TableHead>
                <TableHead className="hidden text-right text-xs font-normal text-muted-foreground xl:table-cell">Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {envios.map((e) => (
                <TableRow
                  key={e.id}
                  className="group cursor-pointer"
                  data-state={marcados.has(e.id) ? 'selected' : undefined}
                  onClick={() => setSeleccionado(e.id)}
                >
                  {/* La casilla no abre el detalle del envío. */}
                  <TableCell className="py-3 pr-0" onClick={(ev) => ev.stopPropagation()}>
                    <Checkbox
                      className={casilla}
                      checked={marcados.has(e.id)}
                      onCheckedChange={() => alternarMarcado(e)}
                      aria-label={`Seleccionar guía ${e.numeroGuia}`}
                    />
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <span className="block font-mono text-sm tabular-nums">{e.numeroGuia}</span>
                    <OrigenBadge origen={e.origen} ocultarPanel className="mt-1 max-w-36" />
                  </TableCell>
                  <TableCell className="max-w-64 py-3 align-top">
                    <span className="block truncate font-medium">{e.destinatario.nombre}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      de {e.remitente.nombre}
                      <span className="lg:hidden"> · {rutaLabel(e.ruta)}</span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden py-3 align-top lg:table-cell">
                    <span className="block">{rutaLabel(e.ruta)}</span>
                    <span className="block max-w-56 truncate text-xs text-muted-foreground" title={resumenItems(e.items)}>
                      {piezasLabel(e.totalPiezas)} · {resumenItems(e.items)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 align-top">
                    <span className="flex items-center gap-2">
                      <EstadoPunto estado={e.estado} />
                      <ConEvidencia envio={e} />
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-right align-top">
                    <span className="block tabular-nums">{formatCurrency(e.costo)}</span>
                    <PagoTexto formaPago={e.formaPago} />
                  </TableCell>
                  <TableCell className="hidden py-3 text-right align-top xl:table-cell">
                    <span className="block text-muted-foreground tabular-nums">{formatDate(e.registro.fecha)}</span>
                    {e.registro.operador && <span className="block text-xs text-muted-foreground">{e.registro.operador}</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
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

      <SeleccionGuias envios={[...marcados.values()]} onLimpiar={() => setMarcados(new Map())} />
      <EnvioDetailSheet envioId={seleccionado} onClose={() => setSeleccionado(null)} />
    </>
  )
}

/** Forma de pago como texto discreto; solo «Al cobro» se destaca porque implica una acción (cobrar). */
function PagoTexto({ formaPago }: { formaPago: FormaPago }) {
  return (
    <span
      className={cn(
        'block text-xs whitespace-nowrap',
        formaPago === 'AL_COBRO' ? 'font-medium text-amber-700 dark:text-amber-300' : 'text-muted-foreground',
      )}
    >
      {FORMA_PAGO_LABEL[formaPago]}
    </span>
  )
}
