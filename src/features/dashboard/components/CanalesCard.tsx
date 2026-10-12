import { Monitor, Plug } from 'lucide-react'
import { Link } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEsAdmin } from '@/features/auth/hooks'
import { INTERACTIVA } from '@/lib/estilos'
import { formatIngreso } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Canal, Resumen } from '@/types/api'

/**
 * Envíos por canal (contrato v10): el panel frente a cada integración por API.
 * Tocar una fila filtra todo el resumen por ese canal (o integración), como en Clientes.
 */
export function CanalesCard({
  data,
  onSelect,
}: {
  data: Resumen
  onSelect: (canal: Canal, integracionId: string | null) => void
}) {
  const esAdmin = useEsAdmin()
  const filas = [...(data.porCanal ?? [])].sort((a, b) => b.envios - a.envios)
  const max = Math.max(1, ...filas.map((f) => f.envios))
  const porApi = filas.filter((f) => f.canal === 'API').reduce((s, f) => s + f.envios, 0)
  const pctApi = data.totalEnvios > 0 ? Math.round((porApi / data.totalEnvios) * 100) : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between gap-2">
        <CardTitle>Envíos por canal</CardTitle>
        {esAdmin && (
          <Link to="/integraciones" className="text-xs text-muted-foreground hover:text-foreground">
            Integraciones
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {filas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin datos en el periodo.</p>
        ) : (
          <>
            <ul className="-mx-2 space-y-0.5" aria-label="Envíos por canal">
              {filas.map((f) => {
                const Icon = f.canal === 'API' ? Plug : Monitor
                const nombre = f.canal === 'API' ? `API · ${f.nombre}` : f.nombre
                return (
                  <li key={f.integracionId ?? f.canal}>
                    <button
                      type="button"
                      onClick={() => onSelect(f.canal, f.integracionId)}
                      aria-label={`Filtrar el resumen por ${nombre}`}
                      className={cn('group block w-full space-y-1.5 rounded-lg px-2 py-2 text-left', INTERACTIVA)}
                    >
                      <span className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <Icon className={cn('size-3.5 shrink-0', f.canal === 'API' ? 'text-brand-blue-text' : 'text-muted-foreground')} />
                          <span className="truncate">{nombre}</span>
                        </span>
                        <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                          <span className="text-xs text-muted-foreground">{f.envios} env.</span>
                          <span className="font-medium text-brand-green-text">{formatIngreso(f.monto)}</span>
                        </span>
                      </span>
                      <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                        <span
                          className={cn('block h-full rounded-full transition-all duration-500', f.canal === 'API' ? 'bg-primary' : 'bg-muted-foreground/40')}
                          style={{ width: `${(f.envios / max) * 100}%` }}
                        />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {pctApi !== null && (
              <p className="text-xs text-muted-foreground">
                {porApi === 0 ? 'Todavía no hay envíos por API en el periodo.' : `${pctApi}% de los envíos llegó por API.`}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
