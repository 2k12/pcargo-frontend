import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import type { Zona } from '@/types/api'
import { ZONA_LABEL, ZONAS } from '../domain'

interface Props {
  value: Zona
  onChange: (zona: Zona) => void
  /** Id del texto de ayuda asociado (aria-describedby). */
  describedBy?: string
  className?: string
}

/**
 * Control segmentado Urbana / Rural (radiogroup accesible: un solo tab-stop y flechas para cambiar).
 * La zona de entrega solo cambia el precio de los tipos con precio rural (hoy, la tela).
 */
export function ZonaPicker({ value, onChange, describedBy, className }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const siguiente = (idx + delta + ZONAS.length) % ZONAS.length
    onChange(ZONAS[siguiente]!)
    refs.current[siguiente]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Zona de entrega"
      aria-describedby={describedBy}
      className={cn('inline-grid w-full grid-cols-2 rounded-lg bg-muted p-0.5 sm:w-auto', className)}
    >
      {ZONAS.map((z, idx) => {
        const activo = z === value
        return (
          <button
            key={z}
            ref={(el) => {
              refs.current[idx] = el
            }}
            type="button"
            role="radio"
            aria-checked={activo}
            tabIndex={activo ? 0 : -1}
            onClick={() => onChange(z)}
            onKeyDown={(e) => onKeyDown(e, idx)}
            className={cn(
              'min-h-9 rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              activo && 'bg-background text-foreground shadow-sm',
            )}
          >
            {ZONA_LABEL[z]}
          </button>
        )
      })}
    </div>
  )
}
