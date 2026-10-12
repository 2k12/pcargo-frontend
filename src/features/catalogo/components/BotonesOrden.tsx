import { ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Subir/bajar un elemento de una lista ordenable: dos botones con nombre accesible que funcionan con teclado
 * (Tab + Enter/Espacio). Cuando el elemento llega a un extremo, el foco pasa al botón que sigue habilitado.
 */
export function BotonesOrden({
  nombre,
  indice,
  total,
  onMover,
  deshabilitado = false,
}: {
  nombre: string
  indice: number
  total: number
  onMover: (delta: -1 | 1) => void
  deshabilitado?: boolean
}) {
  const primero = indice === 0
  const ultimo = indice === total - 1
  const mover = (delta: -1 | 1, e: React.MouseEvent<HTMLButtonElement>) => {
    const grupo = e.currentTarget.parentElement
    onMover(delta)
    // Si tras moverse queda en un extremo, el botón pulsado se deshabilita: el foco pasa al otro.
    const llegaAlExtremo = (delta === -1 && indice === 1) || (delta === 1 && indice === total - 2)
    if (llegaAlExtremo) requestAnimationFrame(() => grupo?.querySelector<HTMLButtonElement>(`[data-orden="${delta === -1 ? 'bajar' : 'subir'}"]`)?.focus())
  }
  return (
    <div className="flex shrink-0 flex-col" role="group" aria-label={`Orden de ${nombre}`}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-orden="subir"
        aria-label={`Subir ${nombre}`}
        disabled={primero || deshabilitado}
        onClick={(e) => mover(-1, e)}
      >
        <ArrowUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-orden="bajar"
        aria-label={`Bajar ${nombre}`}
        disabled={ultimo || deshabilitado}
        onClick={(e) => mover(1, e)}
      >
        <ArrowDown />
      </Button>
    </div>
  )
}
