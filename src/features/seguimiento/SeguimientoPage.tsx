import { AlertTriangle, ArrowRight, Check, Loader2, PackageSearch, PackageX, Search, XCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Logo } from '@/components/brand/PCargoLogo'
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
        'flex items-start gap-2 rounded-lg p-3 text-sm',
        noEntregado ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
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
      <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
        <XCircle className="size-4" />
        Este envío fue cancelado.
      </div>
    )
  }
  // NO_ENTREGADO / NOVEDAD ocurren durante el reparto: se muestra el avance hasta EN_REPARTO.
  const actual = FLUJO_ESTADOS.indexOf(estado === 'NO_ENTREGADO' || estado === 'NOVEDAD' ? 'EN_REPARTO' : estado)
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Progreso del envío">
      {FLUJO_ESTADOS.map((e, i) => {
        const hecho = i <= actual
        return (
          <li key={e} className="space-y-2" aria-current={i === actual ? 'step' : undefined}>
            <div className={cn('h-1 rounded-full bg-muted', hecho && 'bg-primary')} />
            <p className={cn('flex items-center gap-1 text-xs text-muted-foreground', hecho && 'text-foreground')}>
              {hecho && <Check className="size-3" />}
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

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
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
              <HistorialTimeline eventos={data.historial} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
