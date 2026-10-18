import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { Segmented } from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RangoFechas } from '@/features/dashboard/components/RangoFechas'
import { TendenciaCard } from '@/features/dashboard/components/TendenciaCard'
import { fechaEC, formatDia, formatRango, rangoPeriodo } from '@/features/dashboard/domain'
import { FORMA_PAGO_LABEL } from '@/features/envios/domain'
import { errorMessage } from '@/lib/api'
import { SUPERFICIE } from '@/lib/estilos'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ResumenPortal } from '@/types/api'
import { serieTendencia } from './domain'
import { useResumenPortal } from './hooks'

type PeriodoPortal = 'mes' | '7d' | '30d' | 'rango'
const PERIODOS: { value: PeriodoPortal; label: string }[] = [
  { value: 'mes', label: 'Este mes' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'rango', label: 'Rango' },
]

function Kpi({ label, valor, to }: { label: string; valor: string; to?: string }) {
  const contenido = (
    <>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">{valor}</p>
    </>
  )
  return to ? (
    <Link to={to} className={cn('block p-4 transition hover:ring-foreground/25', SUPERFICIE)}>
      {contenido}
    </Link>
  ) : (
    <div className={cn('p-4', SUPERFICIE)}>{contenido}</div>
  )
}

function Kpis({ r }: { r: ResumenPortal }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Indicadores">
      <Kpi label="Envíos" valor={String(r.envios)} to="/portal/envios" />
      <Kpi label="Monto" valor={formatCurrency(r.monto)} />
      <Kpi label="En curso" valor={String(r.enCurso)} to="/portal/envios" />
      <Kpi label="Entregados" valor={String(r.entregados)} to="/portal/envios?estado=ENTREGADO" />
      <Kpi label="Por cobrar" valor={formatCurrency(r.porCobrar)} />
    </div>
  )
}

export function ResumenPortalPage() {
  const [periodo, setPeriodo] = useState<PeriodoPortal>('mes')
  const [rango, setRango] = useState<{ desde: string; hasta: string } | null>(null)
  const [editandoRango, setEditandoRango] = useState(false)
  const [dia, setDia] = useState<string | undefined>()
  // «Este mes» es el valor por defecto del servidor: sin fechas (misma consulta que el encabezado).
  const filtro: { desde?: string; hasta?: string } =
    periodo === 'mes' ? {} : periodo === 'rango' ? (rango ?? {}) : rangoPeriodo(periodo)
  const { data: resumen, isLoading, error } = useResumenPortal(filtro)
  // Al tocar un día del gráfico, las cifras muestran solo ese día; la serie sigue siendo la del periodo.
  const { data: delDia } = useResumenPortal({ desde: dia, hasta: dia }, !!dia)
  const cifras = dia ? delDia : resumen

  const elegir = (p: PeriodoPortal) => {
    setDia(undefined)
    if (p === 'rango') {
      setEditandoRango(true)
      if (!rango) {
        const hoy = fechaEC(Date.now())
        setRango({ desde: `${hoy.slice(0, 8)}01`, hasta: hoy })
      }
    } else setEditandoRango(false)
    setPeriodo(p)
  }

  return (
    <>
      <PageHeader
        title="Resumen"
        description={resumen ? formatRango(resumen.desde, resumen.hasta) : undefined}
        actions={
          <Button nativeButton={false} render={<Link to="/portal/nuevo" />}>
            <Plus />
            Nuevo envío
          </Button>
        }
      />
      <div className="space-y-3">
        <Segmented label="Periodo" value={periodo} onChange={elegir} options={PERIODOS} />
        {periodo === 'rango' && editandoRango && rango && (
          <RangoFechas
            desde={rango.desde}
            hasta={rango.hasta}
            onAplicar={(desde, hasta) => {
              setRango({ desde, hasta })
              setEditandoRango(false)
            }}
            onCancelar={() => setEditandoRango(false)}
            className="max-w-xl"
          />
        )}
        {dia && <p className="text-xs text-muted-foreground">Cifras del {formatDia(dia, true)}.</p>}
      </div>

      {error ? (
        <p className="py-10 text-center text-sm text-destructive">{errorMessage(error)}</p>
      ) : isLoading || !cifras || !resumen ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <Kpis r={cifras} />
          <TendenciaCard
            serie={serieTendencia(resumen.porDia)}
            diaSeleccionado={dia}
            onSelectDia={(f) => setDia((d) => (d === f ? undefined : f))}
            onVerPeriodo={() => setDia(undefined)}
            montoLabel="Monto"
            formatoMonto={formatCurrency}
          />
          {cifras.porFormaPago.length > 0 && (
            <ul className={cn('divide-y px-4', SUPERFICIE)} aria-label="Por forma de pago">
              {cifras.porFormaPago.map((f) => (
                <li key={f.formaPago} className="flex items-center justify-between py-3 text-sm">
                  <span>{FORMA_PAGO_LABEL[f.formaPago]}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {f.envios} {f.envios === 1 ? 'envío' : 'envíos'} · <span className="text-foreground">{formatCurrency(f.monto)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}
