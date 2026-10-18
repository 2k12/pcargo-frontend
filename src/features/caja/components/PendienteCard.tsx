import { ChevronDown, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ROL_LABEL } from '@/features/auth/roles'
import { errorMessage } from '@/lib/api'
import { SUPERFICIE } from '@/lib/estilos'
import { formatCurrency, formatRelativo, iniciales } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CajaPendiente } from '@/types/api'
import { TIPO_COBRO_LABEL } from '../domain'
import { usePendiente } from '../hooks'
import { ListaCobros } from './ListaCobros'

/**
 * Lo que una persona debe entregar. Región común: total, desglose y acción viven en la misma
 * tarjeta; el total es la figura y el resto, información de apoyo.
 */
export function PendienteCard({ pendiente, onCerrar }: { pendiente: CajaPendiente; onCerrar: () => void }) {
  const [abierta, setAbierta] = useState(false)
  const { data, isLoading, error } = usePendiente(abierta ? pendiente.usuario.id : null)
  const { usuario } = pendiente
  const idLista = `cobros-${usuario.id}`

  return (
    <li className={cn('flex flex-col', SUPERFICIE)} aria-label={`Caja de ${usuario.nombre}`}>
      <div className="flex items-start gap-3 p-4 pb-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {iniciales(usuario.nombre)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{usuario.nombre}</p>
          <p className="truncate text-xs text-muted-foreground">
            {ROL_LABEL[usuario.rol]}
            {pendiente.desde && ` · desde ${formatRelativo(pendiente.desde)}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold tracking-tight tabular-nums">{formatCurrency(pendiente.total)}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {pendiente.cantidad} {pendiente.cantidad === 1 ? 'cobro' : 'cobros'}
          </p>
        </div>
      </div>

      {pendiente.porTipo.length > 0 && (
        <dl className="mx-4 flex flex-wrap gap-x-4 gap-y-1 border-t pt-2.5 text-xs">
          {pendiente.porTipo.map((t) => (
            <div key={t.tipo} className="flex gap-1.5">
              <dt className="text-muted-foreground">{TIPO_COBRO_LABEL[t.tipo]}</dt>
              <dd className={cn('font-medium tabular-nums', t.monto < 0 && 'text-destructive')}>
                {formatCurrency(t.monto)} <span className="font-normal text-muted-foreground">({t.cantidad})</span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {abierta && (
        <div id={idLista} className="mx-4 mt-2 max-h-64 overflow-y-auto">
          {error ? (
            <p className="py-2 text-sm text-destructive">{errorMessage(error)}</p>
          ) : isLoading || !data ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : (
            <ListaCobros cobros={data.cobros ?? []} />
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 p-4 pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
          aria-expanded={abierta}
          aria-controls={idLista}
          onClick={() => setAbierta((a) => !a)}
        >
          <ChevronDown className={cn('transition-transform', abierta && 'rotate-180')} />
          {abierta ? 'Ocultar cobros' : 'Ver cobros'}
        </Button>
        <Button size="sm" onClick={onCerrar}>
          <Wallet />
          Cerrar caja
        </Button>
      </div>
    </li>
  )
}
