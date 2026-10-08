import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { diasEntre, fechaEC, MAX_DIAS_SERIE, validarRango } from '../domain'

/**
 * Rango de fechas personalizado (desde / hasta) con el selector nativo del sistema: calendario en móvil,
 * sin dependencias. Valida antes de aplicar y avisa si el gráfico diario no podrá mostrar todo el rango.
 */
export function RangoFechas({
  desde: desdeInicial,
  hasta: hastaInicial,
  onAplicar,
  onCancelar,
  className,
}: {
  desde: string
  hasta: string
  onAplicar: (desde: string, hasta: string) => void
  onCancelar?: () => void
  className?: string
}) {
  const [desde, setDesde] = useState(desdeInicial)
  const [hasta, setHasta] = useState(hastaInicial)
  const [error, setError] = useState<string | null>(null)
  const id = useId()
  const [hoy] = useState(() => fechaEC(Date.now()))
  const largo = !validarRango(desde, hasta, hoy) && diasEntre(desde, hasta) > MAX_DIAS_SERIE

  const aplicar = (e: FormEvent) => {
    e.preventDefault()
    const problema = validarRango(desde, hasta, hoy)
    setError(problema)
    if (!problema) onAplicar(desde, hasta)
  }

  return (
    <form onSubmit={aplicar} noValidate aria-label="Rango de fechas" className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-36 flex-1 space-y-1">
          <Label htmlFor={`${id}-desde`} className="text-xs text-muted-foreground">
            Desde
          </Label>
          <Input
            id={`${id}-desde`}
            type="date"
            value={desde}
            max={hasta || hoy}
            onChange={(e) => setDesde(e.target.value)}
            aria-invalid={!!error}
          />
        </div>
        <div className="min-w-36 flex-1 space-y-1">
          <Label htmlFor={`${id}-hasta`} className="text-xs text-muted-foreground">
            Hasta
          </Label>
          <Input
            id={`${id}-hasta`}
            type="date"
            value={hasta}
            min={desde || undefined}
            max={hoy}
            onChange={(e) => setHasta(e.target.value)}
            aria-invalid={!!error}
          />
        </div>
        <div className="flex gap-2">
          {onCancelar && (
            <Button type="button" variant="ghost" onClick={onCancelar}>
              Cancelar
            </Button>
          )}
          <Button type="submit">Aplicar</Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        largo && (
          <p className="text-xs text-muted-foreground">
            Rango de {diasEntre(desde, hasta)} días: las cifras cubren todo el rango y la tendencia diaria muestra los
            últimos {MAX_DIAS_SERIE}.
          </p>
        )
      )}
    </form>
  )
}
