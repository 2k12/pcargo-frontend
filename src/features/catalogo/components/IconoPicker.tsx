import { useRef, type KeyboardEvent } from 'react'
import { INTERACTIVA, SELECCIONADA } from '@/lib/estilos'
import { cn } from '@/lib/utils'
import type { IconoArticulo } from '@/types/api'
import { ICONOS_ARTICULO, LISTA_ICONOS_ARTICULO } from '../iconos'

/**
 * Rejilla para elegir el icono de un artículo. Es un grupo de radio accesible: Tab entra en la opción elegida
 * y las flechas (o Inicio/Fin) cambian la selección, como un radiogroup nativo.
 */
export function IconoPicker({
  value,
  onChange,
  labelledBy,
  invalido = false,
}: {
  value: IconoArticulo | null
  onChange: (icono: IconoArticulo) => void
  labelledBy: string
  invalido?: boolean
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const actual = value ? LISTA_ICONOS_ARTICULO.indexOf(value) : -1

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = LISTA_ICONOS_ARTICULO.length
    const destino =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? (i + 1) % n
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? (i - 1 + n) % n
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : null
    if (destino === null) return
    e.preventDefault()
    onChange(LISTA_ICONOS_ARTICULO[destino]!)
    refs.current[destino]?.focus()
  }

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-invalid={invalido} className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
      {LISTA_ICONOS_ARTICULO.map((clave, i) => {
        const { icon: Icon, nombre } = ICONOS_ARTICULO[clave]
        const elegido = value === clave
        return (
          <button
            key={clave}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={elegido}
            aria-label={nombre}
            title={nombre}
            tabIndex={elegido || (actual === -1 && i === 0) ? 0 : -1}
            onClick={() => onChange(clave)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn('flex aspect-square items-center justify-center rounded-lg ring-1 ring-foreground/10', INTERACTIVA, elegido && SELECCIONADA)}
          >
            <Icon aria-hidden="true" className="size-5" />
          </button>
        )
      })}
    </div>
  )
}
