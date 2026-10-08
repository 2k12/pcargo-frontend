import { MapPin, Package, Phone, UserPlus, X } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NuevoEnvioDialog } from '@/features/envios/components/NuevoEnvioDialog'
import { INTERACTIVA } from '@/lib/estilos'
import { formatIngreso, iniciales } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Cliente, Resumen } from '@/types/api'

const MAX_CLIENTES = 6

/** Quién genera los ingresos del periodo. Tocar un cliente filtra todo el resumen por él. */
export function ClientesCard({
  data,
  onSelect,
}: {
  data: Resumen
  onSelect: (clienteId: string) => void
}) {
  const registrados = data.porCliente.filter((c) => c.clienteId !== null)
  const sinCliente = data.porCliente.find((c) => c.clienteId === null)
  const top = registrados.slice(0, MAX_CLIENTES)
  const max = Math.max(1, ...top.map((c) => c.monto))
  const pctRegistrados =
    data.ingresos > 0 ? Math.round(((data.ingresos - (sinCliente?.monto ?? 0)) / data.ingresos) * 100) : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between gap-2">
        <CardTitle>Clientes</CardTitle>
        <Link to="/clientes" className="text-xs text-muted-foreground hover:text-foreground">
          Gestionar
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {top.length === 0 ? (
          <div className="space-y-3 py-4 text-center text-sm text-muted-foreground">
            <p>Registra a tus clientes frecuentes para ver quién envía más.</p>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/clientes" />}>
              <UserPlus />
              Ir a clientes
            </Button>
          </div>
        ) : (
          <>
            <ul className="-mx-2 space-y-0.5">
              {top.map((c) => (
                <li key={c.clienteId}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.clienteId!)}
                    aria-label={`Filtrar el resumen por ${c.nombre}`}
                    className={cn('group block w-full space-y-1.5 rounded-lg px-2 py-2 text-left', INTERACTIVA)}
                  >
                    <span className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{c.nombre}</span>
                      <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                        <span className="text-xs text-muted-foreground">{c.envios} env.</span>
                        <span className="font-medium text-brand-green-text">{formatIngreso(c.monto)}</span>
                      </span>
                    </span>
                    <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-brand-green transition-all duration-500"
                        style={{ width: `${(c.monto / max) * 100}%` }}
                      />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {pctRegistrados !== null && (
              <p className="text-xs text-muted-foreground">
                {pctRegistrados}% de los ingresos viene de clientes registrados
                {sinCliente && ` · ${sinCliente.envios} envíos ocasionales`}.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

/** Ficha del cliente por el que se filtra el resumen, con sus acciones más frecuentes. */
export function ClienteFiltradoCard({ cliente, onQuitar }: { cliente: Cliente; onQuitar: () => void }) {
  return (
    <Card className="ring-primary/30">
      <CardHeader className="flex flex-row items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {iniciales(cliente.nombre)}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <CardTitle className="truncate">{cliente.nombre}</CardTitle>
          <a
            href={`tel:${cliente.telefono.replace(/\s/g, '')}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Phone className="size-3" />
            {cliente.telefono}
          </a>
          {cliente.direccion && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{cliente.direccion}</span>
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Quitar filtro de cliente" onClick={onQuitar}>
          <X />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {cliente.notas && <p className="text-xs text-muted-foreground italic">{cliente.notas}</p>}
        <p className="text-xs text-muted-foreground">
          Desde que es cliente: <strong className="text-foreground tabular-nums">{cliente.envios}</strong> envíos ·{' '}
          <strong className="text-brand-green-text tabular-nums">{formatIngreso(cliente.monto)}</strong>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <NuevoEnvioDialog cliente={cliente} label="Nuevo envío" variant="outline" />
          <Button variant="outline" nativeButton={false} render={<Link to={`/envios?clienteId=${cliente.id}`} />}>
            <Package />
            Sus envíos
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
