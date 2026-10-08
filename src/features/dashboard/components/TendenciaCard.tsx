import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Segmented } from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatIngreso } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Resumen } from '@/types/api'
import { estadisticasSerie, formatDia } from '../domain'

type Metrica = 'envios' | 'ingresos'
type Dia = Resumen['porDia'][number]

const valor = (m: Metrica, n: number) => (m === 'ingresos' ? formatIngreso(n) : `${n} ${n === 1 ? 'envío' : 'envíos'}`)

/**
 * Serie diaria del periodo. Una sola métrica a la vez (un solo eje): envíos o ingresos.
 * Cada columna es un botón: al pasar el cursor muestra el detalle y al tocarla filtra el resumen por ese día.
 * La serie es siempre la del periodo completo: el día elegido solo se resalta, y tocarlo otra vez
 * o pulsar "Ver todo el periodo" vuelve a la vista normal.
 */
export function TendenciaCard({
  serie,
  diaSeleccionado,
  onSelectDia,
  onVerPeriodo,
  nota,
}: {
  serie: Dia[]
  /** Aviso bajo el título (p. ej. cuando el rango supera lo que el gráfico puede mostrar). */
  nota?: string
  diaSeleccionado?: string
  onSelectDia: (fecha: string) => void
  onVerPeriodo: () => void
}) {
  const [metrica, setMetrica] = useState<Metrica>('envios')
  const [activo, setActivo] = useState<number | null>(null)
  const { total, promedio, pico } = estadisticasSerie(serie, metrica)
  const max = Math.max(1, ...serie.map((d) => d[metrica]))
  const dia = activo !== null ? serie[activo] : undefined
  const color = metrica === 'ingresos' ? 'bg-brand-green' : 'bg-primary'
  // Etiquetas del eje X: extremos y centro, para no amontonar fechas.
  const marcas = serie.length > 2 ? [0, Math.floor((serie.length - 1) / 2), serie.length - 1] : serie.map((_, i) => i)

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle>Tendencia diaria</CardTitle>
          <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
            <span className={cn('font-semibold', metrica === 'ingresos' ? 'text-brand-green-text' : 'text-foreground')}>
              {metrica === 'ingresos' ? formatIngreso(total) : total}
            </span>
            {metrica === 'envios' && ' envíos'} · {metrica === 'ingresos' ? formatIngreso(promedio) : promedio.toFixed(1)} por día
            {pico && pico[metrica] > 0 && ` · pico el ${formatDia(pico.fecha)}`}
          </p>
          {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {diaSeleccionado && (
            <Button variant="outline" size="sm" onClick={onVerPeriodo}>
              <ArrowLeft />
              Ver todo el periodo
            </Button>
          )}
          <Segmented
            label="Métrica de la tendencia"
            value={metrica}
            onChange={setMetrica}
            options={[
              { value: 'envios', label: 'Envíos' },
              { value: 'ingresos', label: 'Ingresos' },
            ]}
          />
        </div>
      </CardHeader>
      <CardContent>
        {serie.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Sin datos en el periodo.</p>
        ) : (
          <div className="space-y-1.5">
            {diaSeleccionado && (
              <p className="text-xs text-muted-foreground" aria-live="polite">
                Viendo solo el <span className="font-medium text-foreground">{formatDia(diaSeleccionado, true)}</span>.
                Toca la barra de nuevo para ver todo el periodo.
              </p>
            )}
            <div className="relative h-40" onMouseLeave={() => setActivo(null)}>
              {/* Referencia recesiva: el máximo de la escala */}
              <span className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-foreground/10" />
              <span className="pointer-events-none absolute top-0 right-0 -translate-y-full pb-0.5 text-[10px] text-muted-foreground tabular-nums">
                {metrica === 'ingresos' ? formatIngreso(max) : max}
              </span>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-foreground/15" />

              <div className="absolute inset-0 flex items-end gap-[2px]">
                {serie.map((d, i) => {
                  const v = d[metrica]
                  const seleccionado = d.fecha === diaSeleccionado
                  return (
                    <button
                      key={d.fecha}
                      type="button"
                      aria-label={`${formatDia(d.fecha, true)}: ${d.envios} envíos, ${formatIngreso(d.ingresos)}`}
                      aria-pressed={seleccionado}
                      onMouseEnter={() => setActivo(i)}
                      onFocus={() => setActivo(i)}
                      onBlur={() => setActivo(null)}
                      onClick={() => onSelectDia(d.fecha)}
                      className="group flex h-full min-w-0 flex-1 cursor-pointer items-end rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span
                        className={cn(
                          'block w-full rounded-t-[4px] transition-[height,opacity] duration-300',
                          color,
                          activo !== null && activo !== i && 'opacity-40',
                          activo === null && diaSeleccionado && !seleccionado && 'opacity-40',
                          seleccionado && 'ring-2 ring-foreground/60',
                        )}
                        style={{ height: v > 0 ? `max(3px, ${(v / max) * 100}%)` : '0px' }}
                      />
                    </button>
                  )
                })}
              </div>

              {dia && activo !== null && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute top-2 z-10 w-max -translate-x-1/2 rounded-lg bg-popover px-3 py-2 text-xs shadow-md ring-1 ring-foreground/10"
                  style={{ left: `clamp(70px, ${((activo + 0.5) / serie.length) * 100}%, calc(100% - 70px))` }}
                >
                  <p className="font-medium first-letter:uppercase">{formatDia(dia.fecha, true)}</p>
                  <p className="text-muted-foreground tabular-nums">{valor('envios', dia.envios)}</p>
                  <p className="font-medium text-brand-green-text tabular-nums">{formatIngreso(dia.ingresos)}</p>
                  {dia.fecha === diaSeleccionado ? (
                    <p className="mt-1 text-[10px] text-muted-foreground">Toca para ver todo el periodo</p>
                  ) : (
                    dia.envios > 0 && <p className="mt-1 text-[10px] text-muted-foreground">Toca para ver solo este día</p>
                  )}
                </div>
              )}
            </div>
            <div className="relative h-4 text-[10px] text-muted-foreground">
              {marcas.map((i) => (
                <span
                  key={i}
                  className={cn(
                    'absolute whitespace-nowrap',
                    i === 0 ? 'left-0' : i === serie.length - 1 ? 'right-0' : '-translate-x-1/2',
                  )}
                  style={i !== 0 && i !== serie.length - 1 ? { left: `${((i + 0.5) / serie.length) * 100}%` } : undefined}
                >
                  {formatDia(serie[i]!.fecha)}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
