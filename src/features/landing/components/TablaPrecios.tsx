import { Layers } from 'lucide-react'
import { nombreTipo } from '@/features/envios/domain'
import { TIPO_CARGA_ICON } from '@/features/envios/ui'
import { formatCurrency } from '@/lib/format'
import type { TipoCarga } from '@/types/api'

/**
 * Precios publicados por unidad (contrato v8): el precio depende del tipo de carga, no de la ruta.
 * La zona rural solo cambia los tipos con `precioRural`; el mayoreo se indica debajo de la tabla.
 */
export function TablaPrecios({ tipos }: { tipos: TipoCarga[] }) {
  const conMayoreo = tipos.filter((t) => t.mayoreo)

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">Precios por unidad según el tipo de carga y la zona de entrega (USD)</caption>
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th scope="col" className="p-3 font-medium text-muted-foreground sm:p-4">
              Tipo de carga
            </th>
            <th scope="col" className="p-3 text-right font-medium text-muted-foreground sm:p-4">
              Zona urbana
            </th>
            <th scope="col" className="p-3 text-right font-medium text-muted-foreground sm:p-4">
              Zona rural
            </th>
            <th scope="col" className="hidden p-4 text-right font-medium text-muted-foreground sm:table-cell">
              Peso máx.
            </th>
          </tr>
        </thead>
        <tbody>
          {tipos.map((t) => {
            const Icon = TIPO_CARGA_ICON[t.codigo]
            const rural = t.precioRural ?? t.precio
            return (
              <tr key={t.codigo} className="border-b last:border-0">
                <th scope="row" className="p-3 text-left font-medium sm:p-4">
                  <span className="flex items-center gap-2.5">
                    <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                    <span>
                      {t.nombre}
                      <span className="block text-xs font-normal text-muted-foreground sm:hidden">hasta {t.pesoMaxKg} kg</span>
                    </span>
                  </span>
                </th>
                <td className="p-3 text-right font-medium sm:p-4">{formatCurrency(t.precio)}</td>
                <td className={rural === t.precio ? 'p-3 text-right text-muted-foreground sm:p-4' : 'p-3 text-right font-medium sm:p-4'}>
                  {formatCurrency(rural)}
                </td>
                <td className="hidden p-4 text-right text-muted-foreground sm:table-cell">{t.pesoMaxKg} kg</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {conMayoreo.map((t) => (
        <p key={t.codigo} className="flex items-start gap-2.5 border-t bg-accent/50 px-3 py-3 text-sm sm:px-4" data-testid="regla-mayoreo">
          <Layers aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-blue-text" />
          <span>
            <strong className="font-semibold">
              Más de {t.mayoreo!.minimoExclusivo} {nombreTipo(t.codigo, t.mayoreo!.minimoExclusivo)}
            </strong>{' '}
            en un mismo envío: todos a {formatCurrency(t.mayoreo!.precio)} c/u, en cualquier zona.
          </span>
        </p>
      ))}
    </div>
  )
}
