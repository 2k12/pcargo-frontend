import { Bike, PackageOpen, Search, UserRound, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
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
import { esFecha } from '@/features/dashboard/domain'
import { rutaLabel, useRutas } from '@/features/rutas/hooks'
import { talonariosApi } from '@/features/talonarios/api'
import { avisoGuiaTalonario, guiaParaRegistrar, type GuiaParaRegistrar } from '@/features/talonarios/domain'
import { useRepartidores } from '@/features/usuarios/hooks'
import { useDebounced } from '@/hooks/useDebounced'
import { useEsMovil } from '@/hooks/useMediaQuery'
import { errorMessage } from '@/lib/api'
import { OPCIONES_POR_PAGINA } from '@/lib/paginacion'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Envio, Estado, FormaPago } from '@/types/api'
import { CambioEstadoRapido } from './components/CambioEstadoRapido'
import { ConEvidencia } from './components/ConEvidencia'
import { EnvioDetailSheet } from './components/EnvioDetailSheet'
import { EscanearGuiaDialog } from './components/EscanearGuiaDialog'
import { FechaGuiaTexto } from './components/FechaGuiaTexto'
import { EstadoPunto } from './components/EstadoBadge'
import { NuevoEnvioDialog } from './components/NuevoEnvioDialog'
import { OrigenBadge } from './components/OrigenBadge'
import { SeleccionGuias } from './components/SeleccionGuias'
import { enviosApi } from './api'
import { ESTADO_LABEL, ESTADOS, FORMA_PAGO_LABEL, FORMAS_PAGO, piezasLabel, resumenItems } from './domain'
import { rangoFechaGuia } from './fechaGuia'
import { normalizarGuia } from './guia'
import { useEnvios, useOpcionesIntegracion } from './hooks'
import { ImportarEnviosDialog } from './importacion/ImportarEnviosDialog'

const TODOS = 'TODOS'
/** Valor del contrato para filtrar los envíos sin repartidor. */
const SIN_ASIGNAR = 'ninguno'
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
  // Fecha de la guía (contrato v18; antes, de registro): solo los envíos de ese día.
  const fechaUrl = params.get('fecha')
  const fecha = esFecha(fechaUrl) ? fechaUrl : ''
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
  const setFecha = setFiltro('fecha')
  // Repartidor (contrato v12): un id o `ninguno` (sin asignar).
  const repartidorId = params.get('repartidorId') ?? TODOS
  const setRepartidor = setFiltro('repartidorId')
  const { data: repartidores = [] } = useRepartidores()
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
    estado !== TODOS ||
    !!fecha ||
    rutaId !== TODOS ||
    formaPago !== TODOS ||
    canal !== TODOS ||
    repartidorId !== TODOS ||
    !!clienteId ||
    busqueda !== ''
  const limpiar = () => {
    setBusqueda('')
    setParams({}, { replace: true })
  }
  // Filtros de la hoja móvil: fecha, estado, pago, ruta, repartidor y origen (la búsqueda y el cliente tienen su propio control).
  const filtrosHoja =
    [estado, formaPago, rutaId, repartidorId, canal].filter((v) => v !== TODOS).length + (integracionId ? 1 : 0) + (fecha ? 1 : 0)
  const limpiarHoja = () =>
    setParams(
      (p) => {
        for (const clave of ['fecha', 'estado', 'formaPago', 'rutaId', 'repartidorId', 'canal', 'integracionId', 'pagina']) p.delete(clave)
        return p
      },
      { replace: true },
    )
  const esMovil = useEsMovil()
  /** En móvil cada control va con su etiqueta dentro de la hoja; en escritorio, en línea. */
  const campo = (label: string, control: ReactNode) => (esMovil ? <CampoFiltro label={label}>{control}</CampoFiltro> : control)
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [guiaTalonario, setGuiaTalonario] = useState<GuiaParaRegistrar | null>(null)
  const [registroAbierto, setRegistroAbierto] = useState(false)
  // /envios?guia=N (QR de la guía leído con la cámara del teléfono con la sesión abierta): abre ese envío.
  const guiaUrl = params.get('guia')
  useEffect(() => {
    if (guiaUrl === null) return
    setParams(
      (p) => {
        p.delete('guia')
        return p
      },
      { replace: true },
    )
    const n = normalizarGuia(guiaUrl)
    if (!n) return
    const abrir = async () => {
      const envio = await enviosApi.porGuia(n)
      if (envio) return setSeleccionado(envio.id)
      // Contrato v20: una guía en blanco de talonario aún sin registrar se ofrece para registrarla.
      const guia = await talonariosApi.porGuia(n)
      if (guia?.estado === 'DISPONIBLE') {
        setGuiaTalonario(guiaParaRegistrar(guia.numeroGuia, guia.creadoEn))
        setRegistroAbierto(true)
      } else toast.error(guia ? avisoGuiaTalonario(guia) : `No hay ningún envío con la guía ${n}`)
    }
    abrir().catch((e) => toast.error(errorMessage(e)))
  }, [guiaUrl, setParams])
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
    repartidorId: repartidorId === TODOS ? undefined : repartidorId,
    desde: fecha || undefined,
    hasta: fecha || undefined,
    q: q || undefined,
    pagina,
    porPagina,
  })
  const envios = resultado?.datos
  // La selección se guarda al marcar: se toma el estado más reciente de la página para los cambios rápidos.
  const seleccion = [...marcados.values()].map((m) => envios?.find((e) => e.id === m.id) ?? m)
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

  const estadoItems = { [TODOS]: 'Estado', ...ESTADO_LABEL }
  const pagoItems = { [TODOS]: 'Pago', ...FORMA_PAGO_LABEL }
  // Arreglo ordenado: un objeto pondría las claves numéricas ("1", "2"…) antes de TODOS.
  const opcionesRuta = rutas
    .map((r) => ({ value: String(r.id), label: rutaLabel({ origen: r.origen.nombre, destino: r.destino.nombre }) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
  const rutaItems: Record<string, string> = {
    [TODOS]: 'Ruta',
    ...Object.fromEntries(opcionesRuta.map((o) => [o.value, o.label])),
  }

  // El repartidor de la URL se conserva aunque ya no esté activo (o aún no carguen las opciones).
  const repartidoresFiltro =
    repartidorId !== TODOS && repartidorId !== SIN_ASIGNAR && !repartidores.some((r) => r.id === repartidorId)
      ? [...repartidores, { id: repartidorId, nombre: 'Repartidor seleccionado' }]
      : repartidores
  const repartidorItems: Record<string, string> = {
    [TODOS]: 'Repartidor',
    [SIN_ASIGNAR]: 'Sin asignar',
    ...Object.fromEntries(repartidoresFiltro.map((r) => [r.id, r.nombre])),
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

  const filtrosSecundarios = (
    <>
      {campo(
        'Fecha',
        <Input
          type="date"
          aria-label="Filtrar por fecha de la guía"
          title="Fecha de la guía"
          value={fecha}
          max={rangoFechaGuia().max}
          onChange={(e) => setFecha(e.target.value || null)}
          className={esMovil ? 'w-full' : cn('h-8 w-auto', fecha ? 'bg-muted font-medium' : 'text-muted-foreground')}
        />,
      )}
      {campo(
        'Estado',
        <Select items={estadoItems} value={estado} onValueChange={(v) => setEstado(v)}>
          <SelectTrigger className={trigger(estado !== TODOS)} aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todo estado</SelectItem>
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
        'Repartidor',
        <Select items={repartidorItems} value={repartidorId} onValueChange={(v) => setRepartidor(v)}>
          <SelectTrigger className={trigger(repartidorId !== TODOS)} aria-label="Filtrar por repartidor">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todo repartidor</SelectItem>
            <SelectItem value={SIN_ASIGNAR}>Sin asignar</SelectItem>
            {repartidoresFiltro.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nombre}
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
            <EscanearGuiaDialog onEncontrado={setSeleccionado} />
            <ImportarEnviosDialog />
            <NuevoEnvioDialog />
          </>
        }
      />

      <div className="space-y-3">
        {/* Cambio rápido de estado de las guías marcadas (donde antes iban las pestañas de estado). */}
        <CambioEstadoRapido envios={seleccion} onHecho={() => setMarcados(new Map())} className="border-b pb-3" />

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
            <FiltrosMovil activos={filtrosHoja} onLimpiar={limpiarHoja} descripcion="Fecha, estado, forma de pago, ruta, repartidor y origen">
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
                    <RepartidorTexto envio={e} />
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
                    <RepartidorTexto envio={e} className="mt-1" />
                  </TableCell>
                  <TableCell className="py-3 text-right align-top">
                    <span className="block tabular-nums">{formatCurrency(e.costo)}</span>
                    <PagoTexto formaPago={e.formaPago} />
                  </TableCell>
                  <TableCell className="hidden py-3 text-right align-top xl:table-cell">
                    <FechaGuiaTexto envio={e} className="flex justify-end text-muted-foreground" />
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

      <SeleccionGuias envios={seleccion} onLimpiar={() => setMarcados(new Map())} />
      <EnvioDetailSheet envioId={seleccionado} onClose={() => setSeleccionado(null)} />
      {guiaTalonario && <NuevoEnvioDialog abierto={registroAbierto} onAbiertoChange={setRegistroAbierto} guiaTalonario={guiaTalonario} />}
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

/** Repartidor asignado, discreto bajo el estado (proximidad: ambos hablan de la entrega). */
function RepartidorTexto({ envio, className }: { envio: Envio; className?: string }) {
  if (!envio.repartidor) return null
  return (
    <span className={cn('flex min-w-0 items-center gap-1 text-xs text-muted-foreground', className)} title="Repartidor asignado">
      <Bike className="size-3 shrink-0" aria-hidden />
      <span className="sr-only">Repartidor:</span>
      <span className="max-w-32 truncate">{envio.repartidor.nombre}</span>
    </span>
  )
}
