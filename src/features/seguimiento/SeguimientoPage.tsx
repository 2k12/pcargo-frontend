import { ArrowRight, Check, Loader2, PackageSearch, Search, Truck, XCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EstadoBadge } from '@/features/envios/components/EstadoBadge'
import { HistorialTimeline } from '@/features/envios/components/HistorialTimeline'
import { ESTADO_LABEL, FLUJO_ESTADOS, TIPO_CARGA_LABEL } from '@/features/envios/domain'
import { ApiError, errorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Estado } from '@/types/api'
import { useSeguimiento } from './api'

function Stepper({ estado }: { estado: Estado }) {
  if (estado === 'CANCELADO') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
        <XCircle className="size-4" />
        Este envío fue cancelado.
      </div>
    )
  }
  const actual = FLUJO_ESTADOS.indexOf(estado)
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
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="size-3.5" />
          </span>
          PCargo
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
                  {data.destino} · {TIPO_CARGA_LABEL[data.tipoCarga]}
                </p>
                <p className="text-xs text-muted-foreground">Registrado {formatDateTime(data.creadoEn)}</p>
              </div>
              <EstadoBadge estado={data.estado} />
            </CardHeader>
            <CardContent className="space-y-6">
              <Stepper estado={data.estado} />
              <HistorialTimeline eventos={data.historial} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
