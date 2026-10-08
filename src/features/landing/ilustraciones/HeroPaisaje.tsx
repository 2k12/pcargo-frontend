import { useId } from 'react'

// Ilustración de portada: camioneta PCargo en la carretera, con el Imbabura y el Cotacachi al fondo
// y un lago andino, en la paleta de marca (docs/marca.md). Decorativa: aria-hidden.

const C = {
  azul: '#0186C9',
  azulOsc: '#01649A',
  verde: '#A1C734',
  verdeOsc: '#86AC22',
  carton: '#C9955C',
  cartonOsc: '#A9763F',
  cinta: '#EBD6AA',
  tinta: '#0B1B2B',
}

type P = [number, number]

/** Trazos de la línea central con perspectiva: más finos y cortos hacia el horizonte (como en el logo). */
function trazosCarretera(p: [P, P, P, P], n = 9): { d: string; w: number }[] {
  const punto = (t: number): P => {
    const u = 1 - t
    return [0, 1].map(
      (i) => u ** 3 * p[0][i]! + 3 * u * u * t * p[1][i]! + 3 * u * t * t * p[2][i]! + t ** 3 * p[3][i]!,
    ) as P
  }
  const out: { d: string; w: number }[] = []
  let t = 0
  for (let k = 0; k < n && t < 0.96; k++) {
    const largo = 0.085 * (1 - 0.6 * t)
    const [a, b] = [punto(t), punto(Math.min(t + largo, 1))]
    out.push({ d: `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`, w: 6 * (1 - 0.75 * t) })
    t += largo + 0.055 * (1 - 0.5 * t)
  }
  return out
}

const CENTRO: [P, P, P, P] = [
  [214, 480],
  [240, 428],
  [300, 368],
  [352, 334],
]

export function HeroPaisaje({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 640 480" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-cielo`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9EEFB" />
          <stop offset="0.7" stopColor="#EEF7F7" />
          <stop offset="1" stopColor="#F2F8E4" />
        </linearGradient>
        <linearGradient id={`${id}-lago`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6DBBE8" />
          <stop offset="1" stopColor="#9DD2F0" />
        </linearGradient>
        <clipPath id={`${id}-marco`}>
          <rect width="640" height="480" rx="32" />
        </clipPath>
        <clipPath id={`${id}-mini`}>
          <rect width="22" height="22" rx="5" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${id}-marco)`}>
        <rect width="640" height="480" fill={`url(#${id}-cielo)`} />

        {/* Sol y nubes */}
        <circle cx="505" cy="104" r="54" fill="#FFF1C2" />
        <circle cx="505" cy="104" r="36" fill="#FFE59A" opacity="0.7" />
        <g fill="#fff" opacity="0.95">
          <ellipse cx="140" cy="86" rx="48" ry="15" />
          <ellipse cx="168" cy="76" rx="30" ry="17" />
          <ellipse cx="400" cy="62" rx="40" ry="12" />
          <ellipse cx="424" cy="54" rx="24" ry="13" />
        </g>
        <g fill="none" stroke="#5E7A90" strokeWidth="2" strokeLinecap="round" opacity="0.5">
          <path d="M250 96q6-6 12 0q6-6 12 0" />
          <path d="M282 80q5-5 10 0q5-5 10 0" />
        </g>

        {/* Cotacachi (fondo, nevado) */}
        <path d="M300 336 L468 150 Q480 140 492 150 L668 336 Z" fill="#AAD8F2" />
        <path d="M443 178 L468 150 Q480 140 492 150 L518 179 Q503 171 494 182 Q483 168 470 184 Q458 171 443 178Z" fill="#fff" />

        {/* Imbabura (más cerca) */}
        <path d="M-40 344 L168 122 Q184 108 200 120 L424 344 Z" fill="#5CB1E2" />
        <path d="M200 120 L424 344 L262 344 Q236 236 200 120Z" fill="#3A98D2" opacity="0.55" />
        <path d="M148 144 L168 122 Q184 108 200 120 L222 144 Q206 138 196 149 Q186 136 172 150 Q161 138 148 144Z" fill="#fff" />

        {/* Ciudad en el horizonte */}
        <g fill="#2F7DB3" opacity="0.35">
          <rect x="356" y="312" width="14" height="24" />
          <rect x="372" y="302" width="10" height="34" />
          <path d="M386 336 V316 Q394 304 402 316 V336Z" />
          <rect x="398" y="296" width="3" height="10" />
          <rect x="406" y="318" width="18" height="18" />
          <rect x="426" y="308" width="9" height="28" />
        </g>

        {/* Colinas y lago */}
        <path d="M0 344 C110 308 232 316 334 340 C432 364 540 314 640 332 V480 H0Z" fill="#BCDC62" />
        <ellipse cx="104" cy="352" rx="78" ry="11" fill={`url(#${id}-lago)`} />
        <g stroke="#A6CB45" strokeWidth="2" fill="none" opacity="0.8">
          <path d="M440 356 C480 346 530 338 600 342" />
          <path d="M452 368 C494 357 548 350 640 352" />
          <path d="M20 372 C60 364 100 366 140 372" />
        </g>
        <path d="M0 398 C140 356 300 412 432 394 C522 382 584 394 640 386 V480 H0Z" fill={C.verde} />
        <path d="M0 440 C120 420 220 452 330 446 C440 440 540 448 640 436 V480 H0Z" fill={C.verdeOsc} opacity="0.55" />

        {/* Carretera (eco del logo) */}
        <path d="M118 480 C176 424 286 366 348 334 L358 334 C318 370 286 422 302 480 Z" fill="#fff" />
        <g stroke={C.tinta} fill="none">
          {trazosCarretera(CENTRO).map((s) => (
            <path key={s.d} d={s.d} strokeWidth={s.w} />
          ))}
        </g>

        {/* Camioneta PCargo */}
        <g transform="translate(146 398) rotate(-10) scale(0.76)">
          <ellipse cx="88" cy="80" rx="92" ry="9" fill="#000" opacity="0.12" />
          <rect x="0" y="8" width="122" height="60" rx="10" fill={C.azul} />
          <path d="M122 22 H150 Q160 22 166 32 L178 52 Q182 58 182 64 V68 H122Z" fill={C.azul} />
          <path d="M128 28 H148 Q154 28 158 34 L168 50 H128Z" fill="#D7EEFB" />
          <rect x="0" y="50" width="182" height="7" fill={C.verde} />
          <rect x="174" y="56" width="8" height="6" rx="2" fill="#FFE59A" />
          {/* mini isotipo */}
          <g transform="translate(12 18)">
            <g clipPath={`url(#${id}-mini)`}>
              <rect width="22" height="22" fill="#fff" />
              <path d="M0 0H21C14 2 8 6 4.5 12C2.5 15 1.2 18.5 0.9 22H0Z" fill="#008BD0" />
              <path d="M22 2.4C17 4.5 13 8.3 11 13C9.8 15.8 9.6 19 9.6 22H22Z" fill={C.verde} />
            </g>
          </g>
          <text x="40" y="38" fill="#fff" fontSize="17" fontWeight="700" fontFamily="Geist Variable, sans-serif">
            PCargo
          </text>
          <circle cx="34" cy="70" r="12" fill={C.tinta} />
          <circle cx="34" cy="70" r="5" fill="#CBD5DD" />
          <circle cx="146" cy="70" r="12" fill={C.tinta} />
          <circle cx="146" cy="70" r="5" fill="#CBD5DD" />
        </g>

        {/* Encomiendas listas para entregar */}
        <g transform="translate(450 372)">
          <ellipse cx="44" cy="62" rx="56" ry="7" fill="#000" opacity="0.1" />
          <rect x="0" y="16" width="62" height="46" rx="3" fill={C.carton} />
          <rect x="0" y="16" width="62" height="10" fill={C.cartonOsc} />
          <rect x="27" y="16" width="8" height="46" fill={C.cinta} />
          <rect x="54" y="30" width="44" height="32" rx="3" fill="#D6A56C" />
          <rect x="54" y="30" width="44" height="7" fill={C.cartonOsc} />
          <rect x="72" y="30" width="7" height="32" fill={C.cinta} />
          <rect x="12" y="-2" width="40" height="20" rx="2" fill="#fff" stroke="#D5DEE5" />
          <path d="M12 -2 L32 10 L52 -2" fill="none" stroke="#B9C6D1" strokeWidth="1.5" />
        </g>

        {/* Pines de entrega */}
        {[
          [560, 300],
          [86, 318],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <path d="M0 0C-10 0-17 7-17 16C-17 28 0 42 0 42C0 42 17 28 17 16C17 7 10 0 0 0Z" fill={C.azul} />
            <circle cx="0" cy="16" r="6" fill="#fff" />
          </g>
        ))}
      </g>
    </svg>
  )
}
