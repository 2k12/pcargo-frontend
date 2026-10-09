import type { Ciudad, Ruta } from '@/types/api'
import { cn } from '@/lib/utils'
import { conexiones, ubicarCiudades, VOLCANES } from './mapa'

/**
 * Mapa esquemático de cobertura generado con los datos reales (ciudades activas y rutas operativas).
 * Usa tokens de tema (fill-card, fill-foreground…) para verse bien en modo claro y oscuro.
 */
export function MapaCobertura({ ciudades, rutas, className }: { ciudades: Ciudad[]; rutas: Ruta[]; className?: string }) {
  const { puntos, sinUbicar, encuadre } = ubicarCiudades(ciudades)
  if (!encuadre) return null
  const { ancho, alto, proyectar } = encuadre
  const pos = new Map(puntos.map((p) => [p.ciudad.id, p]))
  const lineas = conexiones(rutas).filter(([a, b]) => pos.has(a) && pos.has(b))
  const ecuador = proyectar([0, 0]).y
  const dentro = (x: number, y: number) => x > 10 && x < ancho - 10 && y > 10 && y < alto - 10

  return (
    <figure className={cn('space-y-3', className)}>
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="h-auto w-full rounded-2xl border bg-card"
        role="img"
        aria-label={`Mapa de cobertura: ${ciudades.map((c) => c.nombre).join(', ')}`}
      >
        {/* línea ecuatorial */}
        {ecuador > 16 && ecuador < alto - 16 && (
          <g>
            <line x1="0" x2={ancho} y1={ecuador} y2={ecuador} className="stroke-muted-foreground" strokeDasharray="2 6" strokeWidth="1.5" opacity="0.6" />
            <text x={ancho - 10} y={ecuador - 6} textAnchor="end" fontSize="11" className="fill-muted-foreground">
              Línea ecuatorial · 0°
            </text>
          </g>
        )}

        {/* volcanes de referencia */}
        {VOLCANES.map((v) => {
          const { x, y } = proyectar(v.coord)
          if (!dentro(x, y)) return null
          return (
            <g key={v.nombre} transform={`translate(${x} ${y})`} opacity="0.85">
              <path d="M-16 10 L-3 -10 Q0 -13 3 -10 L16 10Z" className="fill-brand-blue" opacity="0.35" />
              <path d="M-6 -4 L-3 -10 Q0 -13 3 -10 L6 -4 Q3 -6 1 -3 Q-1 -6 -3 -3Z" fill="#fff" />
              <text y="24" textAnchor="middle" fontSize="10" className="fill-muted-foreground">
                {v.nombre}
              </text>
            </g>
          )
        })}

        {/* rutas */}
        <g className="stroke-brand-blue" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 6" fill="none" opacity="0.75">
          {lineas.map(([a, b], i) => {
            const p = pos.get(a)!
            const q = pos.get(b)!
            // curva suave: separa visualmente rutas que comparten dirección
            const [mx, my] = [(p.x + q.x) / 2, (p.y + q.y) / 2]
            const [dx, dy] = [q.x - p.x, q.y - p.y]
            const k = (i % 2 === 0 ? 1 : -1) * 0.12
            return <path key={`${a}-${b}`} d={`M${p.x} ${p.y} Q${mx - dy * k} ${my + dx * k} ${q.x} ${q.y}`} />
          })}
        </g>

        {/* ciudades */}
        {puntos.map((p) => (
          <g key={p.ciudad.id} transform={`translate(${p.x} ${p.y})`}>
            <circle r="13" className="fill-brand-blue" opacity="0.18" />
            <circle r="7" className="fill-brand-blue stroke-card" strokeWidth="3" />
            <text
              y="-16"
              textAnchor="middle"
              fontSize="13"
              fontWeight="600"
              className="fill-foreground stroke-card"
              strokeWidth="4"
              paintOrder="stroke"
            >
              {p.ciudad.nombre}
            </text>
          </g>
        ))}
      </svg>
      {/* Solo si alguna ciudad no tiene coordenadas: así ninguna ciudad de cobertura queda sin mencionar. */}
      {sinUbicar.length > 0 && (
        <figcaption className="text-xs text-muted-foreground">
          También llegamos a: {sinUbicar.map((c) => c.nombre).join(', ')}.
        </figcaption>
      )}
    </figure>
  )
}
