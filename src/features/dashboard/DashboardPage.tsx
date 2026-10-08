import {
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  HandCoins,
  Package,
  RefreshCw,
  TrendingUp,
  Truck,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CampoFiltro, FiltrosMovil, OpcionesFiltro } from '@/components/FiltrosMovil'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { Segmented } from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useClientes } from '@/features/clientes/api'
import { ClienteBuscador } from '@/features/clientes/components/ClienteBuscador'
import { EnvioCard } from '@/features/envios/components/EnvioCard'
import { EnvioDetailSheet } from '@/features/envios/components/EnvioDetailSheet'
import { NuevoEnvioDialog } from '@/features/envios/components/NuevoEnvioDialog'
import { ESTADO_LABEL, FORMA_PAGO_LABEL, TIPO_CARGA_LABEL } from '@/features/envios/domain'
import { useEnvios } from '@/features/envios/hooks'
import { useEsMovil } from '@/hooks/useMediaQuery'
import { ATENCION_TONO, ESTADO_DOT, TIPO_CARGA_ICON } from '@/features/envios/ui'
import { errorMessage } from '@/lib/api'
import { INTERACTIVA, SUPERFICIE } from '@/lib/estilos'
import { formatCurrency, formatIngreso, formatRelativo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Estado, FiltroResumen, Resumen } from '@/types/api'
import { useResumen } from './api'
import { ClienteFiltradoCard, ClientesCard } from './components/ClientesCard'
import { RangoFechas } from './components/RangoFechas'
import { TendenciaCard } from './components/TendenciaCard'
import {
  diasEntre,
  enCamino,
  esFecha,
  esPeriodo,
  fechaEC,
  formatDia,
  formatRango,
  GRUPOS_ESTADO,
  MAX_DIAS_SERIE,
  PERIODOS,
  rangoPeriodo,
  segmentosEstado,
  tasaEntrega,
  ticketPromedio,
  totalGrupo,
  type Periodo,
} from './domain'

const PERIODO_INICIAL: Periodo = '30d'
/** Opción extra del selector de periodo: rango personalizado (desde / hasta). */
const RANGO = 'rango'
type OpcionPeriodo = Periodo | typeof RANGO
const OPCIONES_PERIODO: { value: OpcionPeriodo; label: string }[] = [...PERIODOS, { value: RANGO, label: 'Rango' }]

/** Re-renderiza cada `ms` para mantener vigentes los textos relativos ("hace 2 minutos"). */
function useAhora(ms = 30_000) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return ahora
}

/**
 * Filtros del resumen en la URL (?periodo=, ?desde=&hasta=, ?dia=, ?cliente=): se pueden compartir
 * y la página de clientes enlaza directo al resumen de uno.
 *
 * El día elegido en la tendencia (`?dia=`) es un filtro aparte que NO sustituye al periodo: el panel
 * muestra las cifras de ese día, pero el gráfico sigue mostrando todo el periodo para poder volver
 * o elegir otro día. Elegir o quitar el día crea una entrada en el historial, así que "Atrás" lo deshace.
 */
function useFiltrosResumen() {
  const [params, setParams] = useSearchParams()
  const desdeUrl = params.get('desde') ?? undefined
  const hastaUrl = params.get('hasta') ?? undefined
  // Rango personalizado (?desde=&hasta=): fechas de la URL inválidas se ignoran y se vuelve al periodo.
  const personalizado = esFecha(desdeUrl)
  const periodo: Periodo | null = personalizado ? null : esPeriodo(params.get('periodo')) ? (params.get('periodo') as Periodo) : PERIODO_INICIAL
  const rango = personalizado
    ? { desde: desdeUrl, hasta: esFecha(hastaUrl) && hastaUrl >= desdeUrl ? hastaUrl : desdeUrl }
    : rangoPeriodo(periodo!)
  const diaUrl = params.get('dia')
  const dia = esFecha(diaUrl) ? diaUrl : undefined
  const clienteId = params.get('cliente') ?? undefined

  const actualizar = (cambios: Record<string, string | null>, { historial = false } = {}) =>
    setParams(
      (p) => {
        for (const [k, v] of Object.entries(cambios)) {
          if (v === null) p.delete(k)
          else p.set(k, v)
        }
        return p
      },
      { replace: !historial },
    )

  return {
    /** Lo que muestra el panel: el día elegido o, si no hay, todo el periodo. */
    filtro: (dia ? { desde: dia, hasta: dia, clienteId } : { ...rango, clienteId }) satisfies FiltroResumen,
    /** Lo que muestra la tendencia diaria: siempre el periodo completo. */
    filtroSerie: { ...rango, clienteId } satisfies FiltroResumen,
    periodo,
    dia,
    clienteId,
    setPeriodo: (v: Periodo) =>
      actualizar({ periodo: v === PERIODO_INICIAL ? null : v, desde: null, hasta: null, dia: null }),
    /** Tocar el día ya elegido lo quita (alternar). */
    setDia: (fecha: string) => actualizar({ dia: fecha === dia ? null : fecha }, { historial: true }),
    quitarDia: () => actualizar({ dia: null }, { historial: true }),
    quitarRango: () => actualizar({ desde: null, hasta: null, dia: null }),
    /** Rango elegido a mano: sustituye al periodo y queda en el historial ("Atrás" lo deshace). */
    setRango: (desde: string, hasta: string) =>
      actualizar({ periodo: null, desde, hasta, dia: null }, { historial: true }),
    /** Vuelve a la vista por defecto: últimos 30 días, todos los clientes. */
    limpiarTodo: () => actualizar({ periodo: null, desde: null, hasta: null, dia: null, cliente: null }),
    setCliente: (id: string | null) => actualizar({ cliente: id }),
  }
}

/** Indicador clave. Todos comparten forma y jerarquía (similitud); solo los enlazables reaccionan al cursor. */
function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  to,
  tono,
  valueClassName,
  className,
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  to?: string
  tono?: string
  valueClassName?: string
  className?: string
}) {
  const contenido = (
    <>
      <span className="flex items-center justify-between text-xs text-muted-foreground">
        {label}
        <Icon className={cn('size-4', tono)} />
      </span>
      <span className={cn('truncate text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl', valueClassName)}>{value}</span>
      <span className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
        <span className="truncate">{hint}</span>
        {to && <ArrowUpRight className="size-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />}
      </span>
    </>
  )
  const base = cn('group flex min-w-0 flex-col gap-1.5 p-4', SUPERFICIE, className)
  return to ? (
    <Link to={to} className={cn(base, INTERACTIVA)}>
      {contenido}
    </Link>
  ) : (
    <div className={base}>{contenido}</div>
  )
}

/** Barra de filtros: periodo y cliente, en una fila sobre todas las cifras (afectan a todo el panel). */
function FiltrosBar({ f }: { f: ReturnType<typeof useFiltrosResumen> }) {
  const { data: clientes = [] } = useClientes()
  const cliente = f.clienteId ? clientes.find((c) => c.id === f.clienteId) : undefined
  const esMovil = useEsMovil()

  const chipRango = !f.periodo && f.filtroSerie.desde && (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
      <CalendarDays className="size-3.5" />
      {formatRango(f.filtroSerie.desde, f.filtroSerie.hasta ?? f.filtroSerie.desde)}
      <button type="button" aria-label="Quitar filtro de fecha" onClick={f.quitarRango} className="-m-1 rounded p-1 hover:text-foreground">
        <X className="size-3.5" />
      </button>
    </span>
  )
  const chipDia = f.dia && (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground ring-1 ring-primary/30">
      <CalendarDays className="size-3.5 text-primary" />
      <span className="first-letter:uppercase">{formatDia(f.dia, true)}</span>
      <button type="button" aria-label="Quitar filtro de día" onClick={f.quitarDia} className="-m-1 rounded p-1 hover:text-foreground">
        <X className="size-3.5" />
      </button>
    </span>
  )
  const controlCliente = f.clienteId ? (
    <span className="flex h-8 items-center gap-2 rounded-lg bg-accent px-2.5 text-sm text-accent-foreground ring-1 ring-primary/30">
      <UserRound className="size-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate">
        <span className="text-xs text-muted-foreground">Cliente: </span>
        {cliente?.nombre ?? 'Cliente'}
      </span>
      <button type="button" aria-label="Quitar filtro de cliente" onClick={() => f.setCliente(null)} className="rounded hover:text-foreground">
        <X className="size-4" />
      </button>
    </span>
  ) : (
    <ClienteBuscador clientes={clientes} onSelect={(c) => f.setCliente(c.id)} label="Filtrar por cliente" placeholder="Filtrar por cliente" />
  )

  // «Rango» abre los campos Desde/Hasta; el rango solo se aplica al pulsar Aplicar.
  const [editandoRango, setEditandoRango] = useState(false)
  const seleccion: OpcionPeriodo = editandoRango || !f.periodo ? RANGO : f.periodo
  const elegir = (v: OpcionPeriodo) => {
    if (v === RANGO) return setEditandoRango(true)
    setEditandoRango(false)
    f.setPeriodo(v)
  }
  const [hoy] = useState(() => fechaEC(Date.now()))
  const editorRango = editandoRango && (
    <RangoFechas
      desde={f.filtroSerie.desde ?? rangoPeriodo(PERIODO_INICIAL).desde!}
      hasta={f.filtroSerie.hasta ?? hoy}
      onAplicar={(desde, hasta) => {
        setEditandoRango(false)
        f.setRango(desde, hasta)
      }}
      onCancelar={() => setEditandoRango(false)}
    />
  )

  // Móvil: un botón «Filtros» (periodo y cliente en una hoja inferior) y, a su lado, lo que está aplicado.
  if (esMovil) {
    const activos = (f.periodo === PERIODO_INICIAL ? 0 : 1) + (f.clienteId ? 1 : 0)
    const periodo = PERIODOS.find((p) => p.value === f.periodo)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <FiltrosMovil activos={activos} onLimpiar={f.limpiarTodo} descripcion="Periodo y cliente del resumen">
          <CampoFiltro label="Periodo">
            <OpcionesFiltro label="Periodo" value={seleccion} onChange={elegir} options={OPCIONES_PERIODO} />
            {editorRango && <div className="pt-3">{editorRango}</div>}
          </CampoFiltro>
          <CampoFiltro label="Cliente">{controlCliente}</CampoFiltro>
        </FiltrosMovil>
        {periodo && <span className="text-xs text-muted-foreground">{periodo.label}</span>}
        {chipRango}
        {chipDia}
        {f.clienteId && (
          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground ring-1 ring-primary/30">
            <UserRound className="size-3.5 shrink-0 text-primary" />
            <span className="truncate">{cliente?.nombre ?? 'Cliente'}</span>
            <button type="button" aria-label="Quitar filtro de cliente" onClick={() => f.setCliente(null)} className="-m-1 rounded p-1 hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Periodo"
          value={seleccion}
          onChange={elegir}
          options={OPCIONES_PERIODO}
          className="overflow-x-auto"
        />
        {chipRango}
        {chipDia}
      </div>
      <div className="lg:ml-auto lg:w-80">{controlCliente}</div>
      {editorRango && <div className="w-full lg:order-last lg:basis-full">{editorRango}</div>}
    </div>
  )
}

/**
 * Estados en tres grupos con significado propio (proximidad + región común).
 * Al señalar un estado o un grupo se resaltan sus segmentos en la barra (destino común).
 */
function EstadoCard({ data, sufijo }: { data: Resumen; sufijo: string }) {
  const [activos, setActivos] = useState<Estado[] | null>(null)
  const segmentos = segmentosEstado(data)
  const resaltar = (estados: Estado[] | null) => () => setActivos(estados)
  const sel = activos ? totalGrupo(data, activos) : null
  const selLabel =
    activos?.length === 1 ? ESTADO_LABEL[activos[0]!] : GRUPOS_ESTADO.find((g) => g.estados === activos)?.titulo

  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between gap-2">
        <CardTitle>Estados</CardTitle>
        <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {activos && sel !== null
            ? `${selLabel} · ${sel} · ${data.totalEnvios ? Math.round((sel / data.totalEnvios) * 100) : 0}%`
            : `${data.totalEnvios} envíos`}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          {segmentos
            .filter((s) => s.total > 0)
            .map((s) => (
              <div
                key={s.estado}
                onMouseEnter={resaltar([s.estado])}
                onMouseLeave={resaltar(null)}
                className={cn(
                  'h-full transition-opacity duration-200',
                  ESTADO_DOT[s.estado],
                  activos && !activos.includes(s.estado) && 'opacity-20',
                )}
                style={{ width: `${s.pct}%` }}
              />
            ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-[3fr_2fr_2fr]">
          {GRUPOS_ESTADO.map((g) => {
            const total = totalGrupo(data, g.estados)
            const alerta = g.clave === 'gestion' && total > 0
            return (
              <section
                key={g.clave}
                className="space-y-2"
                aria-label={g.titulo}
                onMouseEnter={resaltar(g.estados)}
                onMouseLeave={resaltar(null)}
              >
                <SectionLabel
                  aside={
                    <span className={cn('rounded-full px-1.5 tabular-nums', alerta && ATENCION_TONO)}>{total}</span>
                  }
                >
                  {g.titulo}
                </SectionLabel>
                <ul className={cn('grid gap-2', g.estados.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
                  {g.estados.map((e) => {
                    const n = data.porEstado[e] ?? 0
                    return (
                      <li key={e}>
                        <Link
                          to={`/envios?estado=${e}${sufijo}`}
                          onMouseEnter={resaltar([e])}
                          onFocus={resaltar([e])}
                          onBlur={resaltar(null)}
                          className={cn(
                            'flex h-full flex-col gap-0.5 rounded-lg px-3 py-2 ring-1 ring-foreground/10',
                            INTERACTIVA,
                            activos?.length === 1 && activos[0] === e && 'bg-muted/40',
                            n === 0 && 'opacity-50',
                          )}
                        >
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={cn('size-1.5 shrink-0 rounded-full', ESTADO_DOT[e])} />
                            <span className="truncate">{ESTADO_LABEL[e]}</span>
                          </span>
                          <span className="text-lg font-semibold tabular-nums">{n}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

type Vista = 'ruta' | 'carga' | 'pago'
type Fila = { key: string; label: string; value: number; display: string; to?: string; icon?: LucideIcon; ingreso?: boolean }

function DistribucionCard({ data, sufijo }: { data: Resumen; sufijo: string }) {
  const [vista, setVista] = useState<Vista>('ruta')
  const [enMonto, setEnMonto] = useState(false)
  const conMonto = vista !== 'carga' && enMonto

  const filas: Fila[] =
    vista === 'ruta'
      ? [...data.porRuta]
          .sort((a, b) => (conMonto ? b.monto - a.monto : b.total - a.total))
          .map((r) => ({
            key: String(r.rutaId),
            label: r.ruta,
            value: conMonto ? r.monto : r.total,
            display: conMonto ? formatIngreso(r.monto) : String(r.total),
            to: `/envios?rutaId=${r.rutaId}${sufijo}`,
            ingreso: conMonto,
          }))
      : vista === 'carga'
        ? [...data.porTipo]
            .sort((a, b) => b.piezas - a.piezas)
            .map((t) => ({
              key: t.tipoCarga,
              label: TIPO_CARGA_LABEL[t.tipoCarga] ?? t.tipoCarga,
              value: t.piezas,
              display: `${t.piezas} pzs`,
              icon: TIPO_CARGA_ICON[t.tipoCarga],
            }))
        : [...data.porFormaPago]
            .sort((a, b) => (conMonto ? b.monto - a.monto : b.envios - a.envios))
            .map((p) => ({
              key: p.formaPago,
              label: FORMA_PAGO_LABEL[p.formaPago] ?? p.formaPago,
              value: conMonto ? p.monto : p.envios,
              display: conMonto ? formatIngreso(p.monto) : String(p.envios),
              to: `/envios?formaPago=${p.formaPago}${sufijo}`,
              ingreso: conMonto,
            }))

  const max = Math.max(1, ...filas.map((f) => f.value))

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Distribución</CardTitle>
        <div className="flex items-center gap-2">
          {vista !== 'carga' && (
            <Segmented
              label="Métrica"
              value={enMonto ? 'monto' : 'envios'}
              onChange={(v) => setEnMonto(v === 'monto')}
              options={[
                { value: 'envios', label: '#' },
                { value: 'monto', label: '$' },
              ]}
            />
          )}
          <Segmented
            label="Agrupar por"
            value={vista}
            onChange={setVista}
            options={[
              { value: 'ruta', label: 'Ruta' },
              { value: 'carga', label: 'Carga' },
              { value: 'pago', label: 'Pago' },
            ]}
          />
        </div>
      </CardHeader>
      <CardContent>
        {filas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin datos en el periodo.</p>
        ) : (
          <ul className="-mx-2 space-y-0.5">
            {filas.map(({ key, label, value, display, to, icon: Icon, ingreso }) => {
              const fila = (
                <>
                  <span className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
                      <span className="truncate">{label}</span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 tabular-nums',
                        ingreso && value > 0 ? 'font-medium text-brand-green-text' : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    >
                      {display}
                    </span>
                  </span>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className={cn(
                        'block h-full rounded-full transition-all duration-500',
                        vista === 'carga' || ingreso ? 'bg-brand-green' : 'bg-primary',
                      )}
                      style={{ width: `${(value / max) * 100}%` }}
                    />
                  </span>
                </>
              )
              const cls = 'group block space-y-1.5 rounded-lg px-2 py-2'
              return (
                <li key={key}>
                  {to ? (
                    <Link to={to} className={cn(cls, INTERACTIVA)}>
                      {fila}
                    </Link>
                  ) : (
                    <div className={cls}>{fila}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function RecientesCard({ clienteId }: { clienteId?: string }) {
  // Solo la primera página de 5: el servidor no envía el resto.
  const { data: envios, isLoading } = useEnvios({ porPagina: 5, clienteId })
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const recientes = envios?.datos ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recientes</CardTitle>
        <Link to={clienteId ? `/envios?clienteId=${clienteId}` : '/envios'} className="text-xs text-muted-foreground hover:text-foreground">
          Ver todos
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : recientes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay envíos.</p>
        ) : (
          recientes.map((e) => <EnvioCard key={e.id} envio={e} onSelect={setSeleccionado} />)
        )}
      </CardContent>
      <EnvioDetailSheet envioId={seleccionado} onClose={() => setSeleccionado(null)} />
    </Card>
  )
}

export function DashboardPage() {
  const f = useFiltrosResumen()
  const { data, isLoading, error, isFetching, refetch, dataUpdatedAt } = useResumen(f.filtro)
  // Sin día elegido es la misma consulta que la del panel (misma clave de caché, sin petición extra).
  const { data: datosSerie } = useResumen(f.filtroSerie)
  const { data: clientes = [] } = useClientes()
  const ahora = useAhora()
  const tasa = data ? tasaEntrega(data) : null
  const cliente = f.clienteId ? clientes.find((c) => c.id === f.clienteId) : undefined
  // Los enlaces al listado de envíos conservan el filtro de cliente.
  const sufijo = f.clienteId ? `&clienteId=${f.clienteId}` : ''

  return (
    <>
      <PageHeader
        title="Resumen"
        description={dataUpdatedAt ? `Actualizado ${formatRelativo(dataUpdatedAt, ahora)}` : 'Estado general de las encomiendas'}
        actions={
          <>
            <Button variant="ghost" size="icon" aria-label="Actualizar" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn(isFetching && 'animate-spin')} />
            </Button>
            <NuevoEnvioDialog cliente={cliente} />
          </>
        }
      />

      <FiltrosBar f={f} />

      {error && <p className="text-sm text-destructive">{errorMessage(error)}</p>}

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className={cn('h-28 rounded-xl', i === 4 && 'col-span-2 lg:col-span-1')} />
          ))}
        </div>
      ) : (
        <div className={cn('space-y-4 transition-opacity', isFetching && 'opacity-70')}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi
              label="Envíos"
              value={String(data.totalEnvios)}
              hint={`${data.totalPiezas} piezas`}
              icon={Package}
              to={f.clienteId ? `/envios?clienteId=${f.clienteId}` : '/envios'}
            />
            <Kpi
              label="En camino"
              value={String(enCamino(data))}
              hint={`${data.porEstado.EN_REPARTO ?? 0} en reparto`}
              icon={Truck}
              to={`/envios?estado=EN_TRANSITO${sufijo}`}
            />
            <Kpi
              label="Entrega"
              value={tasa === null ? '—' : `${tasa}%`}
              hint={`${data.porEstado.ENTREGADO ?? 0} entregados`}
              icon={CircleCheck}
              to={`/envios?estado=ENTREGADO${sufijo}`}
              tono="text-brand-green"
            />
            <Kpi
              label="Ingresos"
              value={formatIngreso(data.ingresos)}
              valueClassName={data.ingresos > 0 ? 'text-brand-green-text' : undefined}
              hint={`${formatCurrency(ticketPromedio(data))} por envío`}
              icon={TrendingUp}
              tono="text-brand-green"
            />
            <Kpi
              label="Por cobrar"
              value={formatCurrency(data.porCobrar)}
              hint="Al cobro, aún sin entregar"
              icon={HandCoins}
              to={`/envios?formaPago=AL_COBRO${sufijo}`}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <TendenciaCard
                serie={(datosSerie ?? data).porDia}
                diaSeleccionado={f.dia}
                onSelectDia={f.setDia}
                onVerPeriodo={f.quitarDia}
                nota={
                  !f.periodo && f.filtroSerie.desde && f.filtroSerie.hasta && diasEntre(f.filtroSerie.desde, f.filtroSerie.hasta) > MAX_DIAS_SERIE
                    ? `Se muestran los últimos ${MAX_DIAS_SERIE} días del rango; las cifras cubren el rango completo.`
                    : undefined
                }
              />
              <EstadoCard data={data} sufijo={sufijo} />
              <DistribucionCard data={data} sufijo={sufijo} />
            </div>
            <div className="space-y-4">
              {cliente ? (
                <ClienteFiltradoCard cliente={cliente} onQuitar={() => f.setCliente(null)} />
              ) : (
                <ClientesCard data={data} onSelect={f.setCliente} />
              )}
              <RecientesCard clienteId={f.clienteId} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
