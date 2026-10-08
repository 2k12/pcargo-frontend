import { useId } from 'react'

// Ilustración "entrega a domicilio": mensajero PCargo entrega una caja en la puerta de una casa.
// Decorativa: aria-hidden. Paleta de marca (docs/marca.md).

const C = {
  azul: '#0186C9',
  azulOsc: '#01649A',
  verde: '#A1C734',
  carton: '#C9955C',
  cartonOsc: '#A9763F',
  cinta: '#EBD6AA',
  tinta: '#0B1B2B',
  pielA: '#C98E66',
  pielB: '#8D5A3B',
  pantalon: '#1E3A55',
  terracota: '#E07A5F',
}

export function EntregaDomicilio({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 520 380" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-fondo`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E3F2FC" />
          <stop offset="1" stopColor="#F1F8E3" />
        </linearGradient>
        <clipPath id={`${id}-marco`}>
          <rect width="520" height="380" rx="28" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-marco)`}>
        <rect width="520" height="380" fill={`url(#${id}-fondo)`} />

        {/* Fachada */}
        <rect x="262" y="58" width="258" height="276" fill="#FBF6EC" />
        <rect x="262" y="58" width="258" height="14" fill="#EADFCB" />
        <rect x="286" y="104" width="64" height="56" rx="4" fill="#D7EEFB" stroke="#E2D6BF" strokeWidth="6" />
        <path d="M318 104 V160 M286 132 H350" stroke="#E2D6BF" strokeWidth="4" />
        <rect x="386" y="150" width="96" height="184" rx="6" fill="#E2D6BF" />
        <rect x="394" y="158" width="80" height="176" rx="4" fill={C.azulOsc} />
        <rect x="404" y="172" width="60" height="62" rx="3" fill={C.azul} opacity="0.55" />
        <rect x="404" y="246" width="60" height="74" rx="3" fill={C.azul} opacity="0.55" />
        <circle cx="462" cy="252" r="4" fill="#F6D27A" />
        <rect x="412" y="126" width="44" height="16" rx="3" fill="#fff" stroke="#E2D6BF" />
        <text x="434" y="138" textAnchor="middle" fontSize="10" fontWeight="700" fill={C.azulOsc} fontFamily="Geist Variable, sans-serif">
          12-34
        </text>

        {/* Planta */}
        <path d="M486 334 L492 300 H520 V334Z" fill={C.carton} />
        <g fill={C.verde}>
          <ellipse cx="500" cy="286" rx="9" ry="22" transform="rotate(-20 500 286)" />
          <ellipse cx="514" cy="280" rx="9" ry="24" transform="rotate(15 514 280)" />
        </g>

        {/* Vereda */}
        <rect x="0" y="334" width="520" height="46" fill="#E4E9EE" />
        <rect x="380" y="330" width="108" height="8" rx="3" fill="#C9B79A" />

        {/* Destinataria en la puerta */}
        <ellipse cx="330" cy="336" rx="40" ry="6" fill="#000" opacity="0.1" />
        <rect x="306" y="252" width="15" height="80" rx="7" fill="#3B4A5A" />
        <rect x="326" y="252" width="15" height="80" rx="7" fill="#3B4A5A" />
        <rect x="300" y="326" width="24" height="9" rx="4" fill={C.tinta} />
        <rect x="324" y="326" width="24" height="9" rx="4" fill={C.tinta} />
        <path d="M296 178 Q296 162 312 162 H336 Q352 162 352 178 V262 H296Z" fill={C.terracota} />
        <rect x="317" y="146" width="14" height="18" fill={C.pielB} />
        <circle cx="324" cy="134" r="22" fill={C.pielB} />
        <path d="M301 136 Q299 108 324 108 Q350 108 348 134 Q346 120 330 118 Q312 118 306 132 Q304 140 301 136Z" fill="#2B1D16" />
        <path d="M346 128 Q356 150 350 172 Q346 150 340 136Z" fill="#2B1D16" />
        <circle cx="314" cy="138" r="2.2" fill={C.tinta} />
        <path d="M309 147 Q314 151 319 147" stroke={C.tinta} strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Mensajero PCargo */}
        <ellipse cx="150" cy="336" rx="50" ry="7" fill="#000" opacity="0.12" />
        <rect x="128" y="250" width="16" height="80" rx="7" fill={C.pantalon} />
        <rect x="150" y="250" width="16" height="80" rx="7" fill={C.pantalon} />
        <rect x="122" y="324" width="27" height="10" rx="5" fill={C.tinta} />
        <rect x="148" y="324" width="27" height="10" rx="5" fill={C.tinta} />
        <path d="M116 176 Q116 160 132 160 H164 Q180 160 180 176 V258 H116Z" fill={C.azul} />
        <rect x="116" y="222" width="64" height="8" fill={C.verde} />
        <rect x="126" y="176" width="20" height="14" rx="3" fill="#fff" />
        <path d="M128 189 L134 178 L144 178 L140 189Z" fill={C.verde} opacity="0.9" />
        <rect x="141" y="146" width="14" height="18" fill={C.pielA} />
        <circle cx="148" cy="132" r="22" fill={C.pielA} />
        <path d="M126 128 Q126 106 148 106 Q170 106 170 128Z" fill={C.azul} />
        <path d="M162 124 Q184 122 190 131 Q176 133 162 131Z" fill={C.azulOsc} />
        <circle cx="158" cy="137" r="2.2" fill={C.tinta} />
        <path d="M153 146 Q158 150 163 146" stroke={C.tinta} strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Brazos hacia la caja */}
        <path d="M170 174 Q196 188 206 210" stroke={C.azul} strokeWidth="16" strokeLinecap="round" fill="none" />
        <path d="M122 182 Q150 236 204 240" stroke={C.azul} strokeWidth="16" strokeLinecap="round" fill="none" />
        <path d="M300 180 Q280 196 268 212" stroke={C.terracota} strokeWidth="16" strokeLinecap="round" fill="none" />
        <path d="M304 206 Q284 232 268 240" stroke={C.terracota} strokeWidth="16" strokeLinecap="round" fill="none" />

        {/* Caja */}
        <rect x="200" y="196" width="72" height="56" rx="4" fill={C.carton} />
        <rect x="200" y="196" width="72" height="12" fill={C.cartonOsc} />
        <rect x="232" y="196" width="9" height="56" fill={C.cinta} />
        <rect x="246" y="224" width="20" height="14" rx="2" fill="#fff" />
        <circle cx="208" cy="214" r="8" fill={C.pielA} />
        <circle cx="208" cy="242" r="8" fill={C.pielA} />
        <circle cx="266" cy="214" r="8" fill={C.pielB} />
        <circle cx="266" cy="242" r="8" fill={C.pielB} />

        {/* Confirmación */}
        <g transform="translate(176 44)">
          <rect width="150" height="46" rx="14" fill="#fff" />
          <path d="M60 46 L72 58 L80 46Z" fill="#fff" />
          <circle cx="24" cy="23" r="13" fill={C.verde} />
          <path d="M18 23 L22.5 27.5 L30.5 19" stroke="#263A0B" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x="46" y="20" fontSize="13" fontWeight="700" fill={C.tinta} fontFamily="Geist Variable, sans-serif">
            ¡Entregado!
          </text>
          <text x="46" y="35" fontSize="10.5" fill="#5B6B7A" fontFamily="Geist Variable, sans-serif">
            En la puerta de tu casa
          </text>
        </g>
      </g>
    </svg>
  )
}
