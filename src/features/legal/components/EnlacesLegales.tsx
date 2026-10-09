import { Link } from 'react-router'
import { PAGINAS_LEGALES, type RutaLegal } from '../datos'

/**
 * Enlaces legales discretos para los pies de página: etiquetas cortas en una línea (Privacidad, Términos…).
 * El nombre accesible es el título completo y contiene el texto visible (WCAG 2.5.3).
 */
export function EnlacesLegales({ className, rutas }: { className?: string; rutas?: readonly RutaLegal[] }) {
  const paginas = rutas ? PAGINAS_LEGALES.filter((p) => rutas.includes(p.ruta)) : PAGINAS_LEGALES
  return (
    <nav aria-label="Información legal" className={className}>
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {paginas.map((p) => (
          <li key={p.ruta}>
            <Link
              to={p.ruta}
              aria-label={p.titulo}
              className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {p.corto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
