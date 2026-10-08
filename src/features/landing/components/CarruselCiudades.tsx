import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { Ciudad } from '@/types/api'

/** Mínimo de nombres por vuelta para que la pista sea más ancha que el contenedor aunque haya pocas ciudades. */
const MIN_POR_VUELTA = 10
/** Segundos que tarda cada nombre en cruzar: la velocidad no cambia con el número de ciudades. */
const SEGUNDOS_POR_NOMBRE = 3

/** Solo el nombre, en mayúsculas y en el azul de marca. 1.575rem = 25,2 px: un 80 % más que el texto base (14 px). */
function NombreCiudad({ nombre }: { nombre: string }) {
  return (
    <li className="shrink-0 text-[1.575rem] leading-tight font-semibold tracking-wide whitespace-nowrap text-brand-blue-text uppercase">
      {nombre}
    </li>
  )
}

/**
 * Ciudades con cobertura desfilando de derecha a izquierda, sin fin. Una máscara en degradado las hace
 * aparecer suavemente por la derecha y desvanecerse antes de llegar al lado izquierdo (donde están los
 * datos de PCargo). Se detiene al pasar el cursor; con «reducir movimiento» se muestra una lista quieta.
 */
export function CarruselCiudades({ ciudades, className }: { ciudades: Pick<Ciudad, 'id' | 'nombre'>[]; className?: string }) {
  if (ciudades.length === 0) return null
  const vueltas = Math.max(1, Math.ceil(MIN_POR_VUELTA / ciudades.length))
  const vuelta = Array.from({ length: vueltas }, () => ciudades).flat()
  const estilo = { '--duracion-marquesina': `${vuelta.length * SEGUNDOS_POR_NOMBRE}s` } as CSSProperties

  return (
    <div role="region" aria-label="Ciudades con cobertura" className={cn('min-w-0', className)}>
      {/* Para lectores de pantalla y para quien pide reducir el movimiento: la lista, una sola vez y quieta. */}
      <ul className="flex flex-wrap gap-x-8 gap-y-2 motion-safe:sr-only">
        {ciudades.map((c) => (
          <NombreCiudad key={c.id} nombre={c.nombre} />
        ))}
      </ul>
      <div
        aria-hidden="true"
        data-testid="carrusel-ciudades"
        className="group hidden overflow-hidden py-1 [mask-image:linear-gradient(to_right,transparent_0%,transparent_8%,black_45%,black_92%,transparent_100%)] motion-safe:block"
      >
        <div className="flex w-max animate-marquesina group-hover:[animation-play-state:paused]" style={estilo}>
          {[0, 1].map((copia) => (
            <ul key={copia} className="flex shrink-0 gap-12 pr-12">
              {vuelta.map((c, i) => (
                <NombreCiudad key={`${copia}-${c.id}-${i}`} nombre={c.nombre} />
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  )
}
