import { useId } from 'react'
import { cn } from '@/lib/utils'

// Isotipo PCargo redibujado en SVG a partir del logo original (public/brand/pcargo-logo-original.png).
// Colores de marca: azul #0186C9 (degradado #008BD0 → #007EC1) y verde #A1C734 (#A7CD35 → #95BC30).

const TRAZOS: [string, number][] = [
  ['M13.50 64.00L14.21 59.05', 3.4],
  ['M14.97 55.76L16.41 51.18', 3.09],
  ['M17.62 48.12L19.63 43.91', 2.81],
  ['M21.19 41.09L23.62 37.24', 2.54],
  ['M25.46 34.65L28.20 31.14', 2.29],
  ['M30.23 28.77L33.19 25.59', 2.06],
  ['M35.37 23.43L38.46 20.56', 1.84],
  ['M40.74 18.59L43.92 16.01', 1.64],
  ['M46.26 14.21L49.46 11.90', 1.45],
  ['M51.83 10.27L55.03 8.20', 1.27],
  ['M57.40 6.73L60.55 4.87', 1.11],
]

export function LogoMark({ className, title = 'PCargo' }: { className?: string; title?: string }) {
  // ids únicos: puede haber varios logos en la misma página
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={cn('size-8 shrink-0', className)}>
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#008BD0" />
          <stop offset="1" stopColor="#007EC1" />
        </linearGradient>
        <linearGradient id={`${id}-v`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A7CD35" />
          <stop offset="1" stopColor="#95BC30" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <rect width="64" height="64" rx="13" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-c)`}>
        <rect width="64" height="64" fill="#fff" />
        <path d="M0 0H60C41 6 23 18 13 34C7 44 3.5 54 2.5 64H0Z" fill={`url(#${id}-a)`} />
        <path d="M64 7C50 13 38.5 24 32.5 38C29 46 28 55 28 64H64Z" fill={`url(#${id}-v)`} />
        <g stroke="#0A0A0A" fill="none">
          {TRAZOS.map(([d, w]) => (
            <path key={d} d={d} strokeWidth={w} />
          ))}
        </g>
      </g>
    </svg>
  )
}

/** Isotipo + logotipo "PCargo" en azul de marca. */
export function Logo({ className, markClassName, subtitulo }: { className?: string; markClassName?: string; subtitulo?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoMark className={markClassName} />
      <span className="flex flex-col leading-tight">
        <span className="font-semibold tracking-tight text-brand-blue-text">PCargo</span>
        {subtitulo && <span className="text-xs font-normal text-muted-foreground">{subtitulo}</span>}
      </span>
    </span>
  )
}
