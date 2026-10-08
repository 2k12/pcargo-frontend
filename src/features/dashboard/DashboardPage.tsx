import { CircleCheck, DollarSign, Package, Truck, type LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ESTADO_LABEL, ESTADOS, TIPO_CARGA_LABEL } from '@/features/envios/domain'
import { ESTADO_DOT, TIPO_CARGA_ICON } from '@/features/envios/ui'
import { errorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { useResumen } from './api'

function Kpi({ label, value, icon: Icon, hint }: { label: string; value: string; icon: LucideIcon; hint?: string }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="rounded-lg bg-muted p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  )
}

function BarList({ items }: { items: { label: string; value: number; icon?: LucideIcon }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Sin datos todavía.</p>
  return (
    <ul className="space-y-3">
      {items.map(({ label, value, icon: Icon }) => (
        <li key={label} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              {Icon && <Icon className="size-3.5 text-muted-foreground" />}
              {label}
            </span>
            <span className="tabular-nums text-muted-foreground">{value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function DashboardPage() {
  const { data, isLoading, error } = useResumen()

  return (
    <>
      <PageHeader title="Resumen" description="Estado general de las encomiendas" />

      {error && <p className="text-sm text-destructive">{errorMessage(error)}</p>}

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Total de envíos" value={String(data.totalEnvios)} icon={Package} />
            <Kpi label="Ingresos" value={formatCurrency(data.ingresos)} icon={DollarSign} hint="Excluye cancelados" />
            <Kpi
              label="En camino"
              value={String((data.porEstado.EN_TRANSITO ?? 0) + (data.porEstado.EN_REPARTO ?? 0))}
              icon={Truck}
              hint="En tránsito + en reparto"
            />
            <Kpi label="Entregados" value={String(data.porEstado.ENTREGADO ?? 0)} icon={CircleCheck} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Por estado</CardTitle>
                <CardDescription>Distribución actual</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {ESTADOS.map((e) => (
                    <li key={e} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${ESTADO_DOT[e]}`} />
                        {ESTADO_LABEL[e]}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{data.porEstado[e] ?? 0}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Por ruta</CardTitle>
                <CardDescription>Envíos registrados por trayecto</CardDescription>
              </CardHeader>
              <CardContent>
                <BarList items={data.porRuta.map((r) => ({ label: r.ruta, value: r.total }))} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Por tipo de carga</CardTitle>
                <CardDescription>Sobres, paquetes, cartones y valijas</CardDescription>
              </CardHeader>
              <CardContent>
                <BarList
                  items={data.porTipo.map((t) => ({
                    label: TIPO_CARGA_LABEL[t.tipoCarga] ?? t.tipoCarga,
                    value: t.total,
                    icon: TIPO_CARGA_ICON[t.tipoCarga],
                  }))}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  )
}
