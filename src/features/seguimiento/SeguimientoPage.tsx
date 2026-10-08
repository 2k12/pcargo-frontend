import { AlertTriangle, ArrowRight, Check, Loader2, PackageSearch, PackageX, Search, XCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Logo } from '@/components/brand/PCargoLogo'
import { SectionLabel } from '@/components/layout/SectionLabel'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EstadoBadge } from '@/features/envios/components/EstadoBadge'
import { HistorialTimeline } from '@/features/envios/components/HistorialTimeline'
import { ESTADO_LABEL, FLUJO_ESTADOS, piezasLabel, resumenItems } from '@/features/envios/domain'
import { ApiError, errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { responderAgente, useHerramientasAgente } from '@/lib/webmcp'
import type { Estado, EventoHistorial } from '@/types/api'
import { ESTADO_TONO } from '@/features/envios/ui'
import { MENSAJE_GUIA_INVALIDA, normalizarGuia } from '@/features/envios/guia'
import { consultarGuiaParaAgente, HERRAMIENTAS_PUBLICAS } from '@/features/landing/agente'
import { EnlacesLegales } from '@/features/legal/components/EnlacesLegales'
import { useSeguimiento } from './api'
import { MENSAJE_ESTADO } from './estados'
import { PersonajeEstado } from './PersonajeEstado'

/** Aviso para estados fuera del camino feliz, con el motivo registrado. */
function AvisoEntrega({ estado, historial }: { estado: Estado; historial: EventoHistorial[] }) {
  if (estado !== 'NO_ENTREGADO' && estado !== 'NOVEDAD') return null
  const ultimo = [...historial].reverse().find((h) => h.estado === estado)
  const noEntregado = estado === 'NO_ENTREGADO'
  const Icon = noEntregado ? PackageX : AlertTriangle
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-xl p-3 text-sm',
        ESTADO_TONO[estado],
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">
          {noEntregado ? 'No pudimos entregar tu encomienda' : 'Tu encomienda tiene una novedad'}
        </p>
        {ultimo?.nota && <p>Motivo: {ultimo.nota}</p>}
        <p>
          {noEntregado ? 'Reintentaremos la entrega o te contactaremos.' : 'Estamos gestionándola para continuar con la entrega.'}
        </p>
      </div>
    </div>
  )
}

function Stepper({ estado }: { estado: Estado }) {
  if (estado === 'CANCELADO') {
    return (
      <div className={cn('flex items-center gap-2 rounded-xl p-3 text-sm', ESTADO_TONO.CANCELADO)}>
        <XCircle className="size-4" />
        Este envío fue cancelado.
      </div>
    )
  }
  // NO_ENTREGADO / NOVEDAD ocurren durante el reparto: se muestra el avance hasta EN_REPARTO.
  const actual = FLUJO_ESTADOS.indexOf(estado === 'NO_ENTREGADO' || estado === 'NOVEDAD' ? 'EN_REPARTO' : estado)
  // Una sola línea que une los hitos (continuidad): el tramo recorrido se pinta con el color de marca.
  return (
    <ol className="flex items-start" aria-label="Progreso del envío">
      {FLUJO_ESTADOS.map((e, i) => {
        const hecho = i <= actual
        return (
          <li
            key={e}
            className="relative flex flex-1 flex-col items-center gap-2 text-center"
            aria-current={i === actual ? 'step' : undefined}
          >
            {i > 0 && (
              <span
                aria-hidden
                className={cn('absolute top-[7px] right-1/2 h-0.5 w-full', hecho ? 'bg-primary' : 'bg-muted')}
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative flex size-4 items-center justify-center rounded-full border-2 border-muted bg-card',
                hecho && 'border-primary bg-primary text-primary-foreground',
                i === actual && 'ring-4 ring-primary/20',
              )}
            >
              {hecho && <Check className="size-2.5" strokeWidth={3} />}
            </span>
            <p className={cn('text-[11px] leading-tight text-muted-foreground sm:text-xs', hecho && 'font-medium text-foreground')}>
              {ESTADO_LABEL[e]}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

/** `embebido`: se muestra dentro del panel (AppShell) para el personal logueado, sin la cabecera pública. */
export function SeguimientoPage({ embebido = false }: { embebido?: boolean }) {
  const { numeroGuia } = useParams<{ numeroGuia: string }>()
  useHerramientasAgente(HERRAMIENTAS_PUBLICAS)
  const navigate = useNavigate()
  const base = embebido ? '/panel/seguimiento' : '/seguimiento'
  const [valor, setValor] = useState(numeroGuia ?? '')
  const [invalido, setInvalido] = useState(false)
  const { data, isLoading, error } = useSeguimiento(numeroGuia)

  const buscar = (e: FormEvent) => {
    e.preventDefault()
    if (!valor.trim()) return
    const n = normalizarGuia(valor)
    setInvalido(n === null)
    responderAgente(e, () => (n ? consultarGuiaParaAgente(n) : MENSAJE_GUIA_INVALIDA))
    if (n) navigate(`${base}/${n}`)
  }

  const noEncontrado = error instanceof ApiError && error.status === 404

  return (
    <div className={embebido ? undefined : 'min-h-svh bg-muted/30'}>
      {!embebido && (
        <header className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link to="/" aria-label="PCargo — inicio">
            <Logo markClassName="size-8" />
          </Link>
          <ThemeToggle />
        </header>
      )}

      <main className={cn('space-y-6', embebido ? 'max-w-5xl' : 'mx-auto max-w-5xl px-4 py-8 sm:py-12')}>
        <div className={cn('space-y-6', embebido ? 'max-w-2xl' : 'mx-auto max-w-2xl')}>
          <div className={cn('space-y-2', !embebido && 'text-center')}>
            <h1 className="text-2xl font-semibold tracking-tight">{embebido ? 'Rastreo de envíos' : 'Rastrea tu encomienda'}</h1>
            <p className="text-sm text-muted-foreground">Ingresa el número de tu guía, con o sin los ceros de adelante (ej. 0040425).</p>
        </div>

        <form
          onSubmit={buscar}
          toolname="ver_seguimiento"
          tooldescription="Muestra el estado, la ruta y el historial de una encomienda de PCargo a partir de su número de guía."
          toolautosubmit=""
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <PackageSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="numeroGuia"
              toolparamdescription="Número de guía: solo dígitos; los ceros a la izquierda no cuentan."
              aria-label="Número de guía"
              aria-invalid={invalido}
              inputMode="numeric"
              autoComplete="off"
              className="h-10 pl-8 font-mono"
              placeholder="N.º de guía"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value)
                setInvalido(false)
              }}
            />
          </div>
          <Button type="submit" size="lg" className="h-10">
            <Search />
            Buscar
          </Button>
        </form>
        {invalido && (
          <p role="alert" className="-mt-3 text-sm text-destructive">
            {MENSAJE_GUIA_INVALIDA}
          </p>
        )}

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="py-6 text-center text-sm">
              {noEncontrado ? (
                <>
                  <p className="font-medium">No encontramos ese envío</p>
                  <p className="text-muted-foreground">Verifica el número de la guía e inténtalo nuevamente.</p>
                </>
              ) : (
                <p className="text-destructive">{errorMessage(error)}</p>
              )}
            </CardContent>
          </Card>
        )}

        </div>

        {data && (
          // Escritorio: datos a la izquierda y el personaje del estado, grande, a la derecha.
          <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1fr)_22rem]">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="font-mono">Guía {data.numeroGuia}</CardTitle>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {data.origen}
                    <ArrowRight className="size-3.5" />
                    {data.destino}
                  </p>
                  <p className="text-sm" data-testid="seguimiento-items">
                    {resumenItems(data.items)} <span className="text-muted-foreground">· {piezasLabel(data.totalPiezas)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Registrado {formatDateTime(data.creadoEn)}</p>
                </div>
                {/* Móvil: el personaje también va a la derecha, junto a los datos de la guía. */}
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <EstadoBadge estado={data.estado} />
                  <PersonajeEstado estado={data.estado} className="-mr-2 size-28 sm:size-32 md:hidden" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <AvisoEntrega estado={data.estado} historial={data.historial} />
                <Stepper estado={data.estado} />
                <section className="space-y-3 border-t pt-5" aria-label="Historial">
                  <SectionLabel>Historial</SectionLabel>
                  <HistorialTimeline eventos={data.historial} />
                </section>
              </CardContent>
            </Card>
            <aside
              aria-label="Estado de tu encomienda"
              className="hidden rounded-2xl border bg-card p-6 text-center md:sticky md:top-6 md:block"
            >
              <PersonajeEstado estado={data.estado} className="mx-auto w-full max-w-72" />
              <p className="mt-2 text-lg font-semibold tracking-tight text-balance">{MENSAJE_ESTADO[data.estado].titulo}</p>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">{MENSAJE_ESTADO[data.estado].texto}</p>
            </aside>
          </div>
        )}
      </main>
      {!embebido && (
        <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted-foreground">
          <EnlacesLegales className="flex justify-center" />
        </footer>
      )}
    </div>
  )
}
