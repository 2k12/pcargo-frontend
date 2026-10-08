import { Link } from 'react-router'
import { PAGINAS_LEGALES } from '../datos'

/** Enlaces a las políticas, para los pies de página públicos. */
export function EnlacesLegales({ className }: { className?: string }) {
  return (
    <nav aria-label="Información legal" className={className}>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {PAGINAS_LEGALES.map((p) => (
          <li key={p.ruta}>
            <Link to={p.ruta} className="underline-offset-4 hover:text-foreground hover:underline">
              {p.titulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
