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
import type { Estado, EventoHistorial } from '@/types/api'
import { ESTADO_TONO } from '@/features/envios/ui'
import { useSeguimiento } from './api'

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
        {ultimo?.nota && <p className="opacity-90">Motivo: {ultimo.nota}</p>}
        <p className="opacity-80">
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

export function SeguimientoPage() {
  const { codigo } = useParams<{ codigo: string }>()
  const navigate = useNavigate()
  const [valor, setValor] = useState(codigo ?? '')
  const { data, isLoading, error } = useSeguimiento(codigo)

  const buscar = (e: FormEvent) => {
    e.preventDefault()
    const c = valor.trim().toUpperCase()
    if (c) navigate(`/seguimiento/${c}`)
  }

  const noEncontrado = error instanceof ApiError && error.status === 404

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link to="/" aria-label="PCargo — inicio">
          <Logo markClassName="size-8" />
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:py-12">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Rastrea tu encomienda</h1>
          <p className="text-sm text-muted-foreground">Ingresa el código que recibiste al enviar (ej. PC-7K2M9QXA).</p>
        </div>

        <form onSubmit={buscar} className="flex gap-2">
          <div className="relative flex-1">
            <PackageSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Código de seguimiento"
              className="h-10 pl-8 font-mono uppercase"
              placeholder="PC-XXXXXXXX"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="h-10">
            <Search />
            Buscar
          </Button>
        </form>

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
                  <p className="text-muted-foreground">Verifica el código e inténtalo nuevamente.</p>
                </>
              ) : (
                <p className="text-destructive">{errorMessage(error)}</p>
              )}
            </CardContent>
          </Card>
        )}

        {data && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="font-mono">{data.codigo}</CardTitle>
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
              <EstadoBadge estado={data.estado} />
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
        )}
      </main>
    </div>
  )
}
