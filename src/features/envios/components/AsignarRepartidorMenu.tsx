import { Check, UserMinus } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRepartidores } from '@/features/usuarios/hooks'
import { iniciales } from '@/lib/format'

/**
 * Menú para elegir un repartidor activo (`GET /usuarios/repartidores`). Sirve para asignar desde la
 * selección de guías y para reasignar desde el detalle de un envío.
 */
export function AsignarRepartidorMenu({
  trigger,
  children,
  actualId,
  onElegir,
  permitirQuitar = true,
  align = 'end',
  side = 'bottom',
}: {
  /** Elemento del disparador (Base UI: prop `render`). */
  trigger: ReactElement
  children: ReactNode
  actualId?: string | null
  onElegir: (repartidorId: string | null, nombre: string | null) => void
  permitirQuitar?: boolean
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom'
}) {
  const { data: repartidores = [], isLoading } = useRepartidores()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger}>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">Repartidor</DropdownMenuLabel>
          {isLoading ? (
            <DropdownMenuItem disabled>Cargando…</DropdownMenuItem>
          ) : repartidores.length === 0 ? (
            <DropdownMenuItem disabled>No hay repartidores activos</DropdownMenuItem>
          ) : (
            repartidores.map((r) => (
              <DropdownMenuItem key={r.id} onClick={() => onElegir(r.id, r.nombre)}>
                <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">
                  {iniciales(r.nombre)}
                </span>
                <span className="flex-1 truncate">{r.nombre}</span>
                {r.id === actualId && <Check className="text-muted-foreground" />}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
        {permitirQuitar && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onElegir(null, null)}>
              <UserMinus />
              Quitar asignación
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
