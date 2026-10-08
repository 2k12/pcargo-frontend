import { useId, type ReactNode } from 'react'
import type { Estado } from '@/types/api'
import { COLOR_ESTADO } from './estados'

// «Cajita», la mascota de PCargo: una caja de cartón con la gorra de la marca. Cada estado del envío
// la muestra con una pose, una expresión y accesorios propios. Paleta de marca (docs/marca.md) más el
// color semántico de cada estado (el mismo de las insignias). Decorativa: aria-hidden.

const C = {
  azul: '#0186C9',
  azulOsc: '#01649A',
  verde: '#A1C734',
  carton: '#D49F63',
  cartonClaro: '#E6BC84',
  cartonOsc: '#A9763F',
  cinta: '#EBD6AA',
  tinta: '#0B1B2B',
  mejilla: '#F08F8F',
}

type Animo = 'feliz' | 'euforico' | 'decidido' | 'triste' | 'preocupado' | 'dormido'

/** Ojos, cejas, boca y mejillas sobre la cara frontal de la caja. */
function Cara({ animo, apagado }: { animo: Animo; apagado?: boolean }) {
  const tinta = apagado ? '#4B5563' : C.tinta
  const ojos =
    animo === 'dormido' ? (
      <g stroke={tinta} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M97 140q7 6 14 0" />
        <path d="M129 140q7 6 14 0" />
      </g>
    ) : animo === 'euforico' ? (
      <g stroke={tinta} strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M97 142q7-9 14 0" />
        <path d="M129 142q7-9 14 0" />
      </g>
    ) : (
      <g>
        <ellipse cx="104" cy="139" rx="5.5" ry={animo === 'triste' ? 5.5 : 7} fill={tinta} />
        <ellipse cx="136" cy="139" rx="5.5" ry={animo === 'triste' ? 5.5 : 7} fill={tinta} />
        <circle cx="106" cy="136" r="1.8" fill="#fff" />
        <circle cx="138" cy="136" r="1.8" fill="#fff" />
      </g>
    )
  const cejas =
    animo === 'preocupado' || animo === 'triste' ? (
      <g stroke={tinta} strokeWidth="3" strokeLinecap="round">
        <path d="M96 127l12-4" />
        <path d="M144 127l-12-4" />
      </g>
    ) : animo === 'decidido' ? (
      <g stroke={tinta} strokeWidth="3" strokeLinecap="round">
        <path d="M96 125l12 3" />
        <path d="M144 125l-12 3" />
      </g>
    ) : null
  const boca = {
    feliz: <path d="M110 155q10 10 20 0" stroke={tinta} strokeWidth="3.5" strokeLinecap="round" fill="none" />,
    decidido: <path d="M111 157q9 6 18 0" stroke={tinta} strokeWidth="3.5" strokeLinecap="round" fill="none" />,
    euforico: (
      <g>
        <path d="M107 152q13 20 26 0z" fill={tinta} />
        <path d="M114 160q6 5 12 0q-6-4-12 0z" fill="#F07A7A" />
      </g>
    ),
    triste: <path d="M110 162q10-9 20 0" stroke={tinta} strokeWidth="3.5" strokeLinecap="round" fill="none" />,
    preocupado: (
      <path d="M107 160q3.5-4 7 0t7 0t7 0t7 0" stroke={tinta} strokeWidth="3" strokeLinecap="round" fill="none" />
    ),
    dormido: <path d="M113 158h14" stroke={tinta} strokeWidth="3" strokeLinecap="round" />,
  }[animo]
  return (
    <g>
      {cejas}
      {ojos}
      {!apagado && (
        <g fill={C.mejilla} opacity="0.55">
          <ellipse cx="94" cy="151" rx="6" ry="3.5" />
          <ellipse cx="146" cy="151" rx="6" ry="3.5" />
        </g>
      )}
      {boca}
    </g>
  )
}

/** Cuerpo de la caja (frente, lateral y tapa) con la gorra de PCargo. */
function Caja({ apagado, cinta }: { apagado?: boolean; cinta?: ReactNode }) {
  const carton = apagado ? '#B8B2AA' : C.carton
  const claro = apagado ? '#CFCAC3' : C.cartonClaro
  const oscuro = apagado ? '#948D84' : C.cartonOsc
  return (
    <g>
      {/* lateral y tapa: un toque de volumen */}
      <path d="M162 106l14-10v72l-14 12z" fill={oscuro} />
      <path d="M78 106l14-12h84l-14 12z" fill={claro} />
      <rect x="78" y="106" width="84" height="74" rx="7" fill={carton} />
      {/* cinta de la tapa */}
      <path d="M113 106l14-12h9l-14 12z" fill={apagado ? '#DCD6CC' : C.cinta} opacity="0.9" />
      <rect x="113" y="106" width="13" height="18" fill={apagado ? '#DCD6CC' : C.cinta} opacity="0.9" />
      {cinta}
      {/* gorra de mensajero */}
      <path d="M104 95c0-19 44-19 44 0z" fill={apagado ? '#7C8A96' : C.azul} />
      <path d="M118 89c4-7 12-7 16 0" stroke={apagado ? '#A3ADB6' : C.verde} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M142 93c12-1 21 2 25 7l-24 0z" fill={apagado ? '#5F6B76' : C.azulOsc} />
    </g>
  )
}

const brazo = (d: string, apagado?: boolean) => (
  <path d={d} stroke={apagado ? '#948D84' : C.cartonOsc} strokeWidth="7" strokeLinecap="round" fill="none" />
)
const mano = (cx: number, cy: number, apagado?: boolean) => (
  <circle cx={cx} cy={cy} r="6.5" fill={apagado ? '#CFCAC3' : C.cartonClaro} stroke={apagado ? '#948D84' : C.cartonOsc} strokeWidth="2.5" />
)
const piernas = (izq: string, der: string, zapIzq: [number, number], zapDer: [number, number], apagado?: boolean) => (
  <g>
    <path d={izq} stroke={apagado ? '#948D84' : C.cartonOsc} strokeWidth="6" strokeLinecap="round" fill="none" />
    <path d={der} stroke={apagado ? '#948D84' : C.cartonOsc} strokeWidth="6" strokeLinecap="round" fill="none" />
    <ellipse cx={zapIzq[0]} cy={zapIzq[1]} rx="10" ry="5.5" fill={apagado ? '#7C8A96' : C.azul} />
    <ellipse cx={zapDer[0]} cy={zapDer[1]} rx="10" ry="5.5" fill={apagado ? '#7C8A96' : C.azul} />
  </g>
)
const piernasQuietas = (apagado?: boolean) =>
  piernas('M104 180v16', 'M136 180v16', [101, 198], [139, 198], apagado)

/** Insignia circular arriba a la derecha con el color del estado. */
const Insignia = ({ color, children }: { color: string; children: ReactNode }) => (
  <g>
    <circle cx="196" cy="56" r="19" fill={color} />
    <circle cx="196" cy="56" r="19" fill="none" stroke="#fff" strokeWidth="3" opacity="0.9" />
    <g stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {children}
    </g>
  </g>
)

function Escena({ estado }: { estado: Estado }) {
  const color = COLOR_ESTADO[estado]
  switch (estado) {
    case 'REGISTRADO':
      return (
        <g>
          {/* destellos */}
          <g fill={color} opacity="0.7">
            <path d="M52 70l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
            <path d="M188 112l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
          </g>
          {piernasQuietas()}
          {/* saluda con la izquierda */}
          {brazo('M80 136q-18-8-22-30')}
          {mano(58, 104)}
          <Caja />
          <Cara animo="feliz" />
          {/* portapapeles con la guía */}
          {brazo('M160 142q12 4 18 0')}
          <g transform="rotate(8 186 142)">
            <rect x="168" y="114" width="38" height="50" rx="5" fill="#fff" stroke={C.tinta} strokeOpacity="0.15" strokeWidth="2" />
            <rect x="178" y="109" width="18" height="9" rx="3" fill={C.azul} />
            <path d="M175 130h24M175 138h18M175 146h21" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
            <path d="M184 154l5 5 9-11" stroke={C.verde} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
          {mano(178, 142)}
        </g>
      )
    case 'EN_TRANSITO':
      return (
        <g>
          {/* carretera y líneas de velocidad */}
          <path d="M20 206h200" stroke="#94A3B8" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" strokeDasharray="14 12" />
          <g stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.8">
            <path d="M30 118h30" />
            <path d="M20 140h38" />
            <path d="M34 162h22" />
          </g>
          <g fill={C.tinta} opacity="0.12">
            <circle cx="70" cy="198" r="7" />
            <circle cx="58" cy="194" r="5" />
          </g>
          <g transform="rotate(-6 120 160)">
            {/* ruedas en lugar de pies */}
            {[100, 140].map((x) => (
              <g key={x}>
                <circle cx={x} cy="190" r="12" fill="#1F2937" stroke="#94A3B8" strokeWidth="2.5" />
                <circle cx={x} cy="190" r="5" fill="#CBD5E1" />
              </g>
            ))}
            {brazo('M80 140q-14 6-20 18')}
            {mano(60, 158)}
            <Caja />
            <Cara animo="decidido" />
            {brazo('M160 140q14 6 20 18')}
            {mano(180, 158)}
          </g>
          {/* destino */}
          <g transform="translate(196 74)">
            <path d="M0 22c-10-12-15-19-15-26a15 15 0 0 1 30 0c0 7-5 14-15 26z" fill={color} />
            <circle cx="0" cy="-4" r="6" fill="#fff" />
          </g>
        </g>
      )
    case 'EN_REPARTO':
      return (
        <g>
          {/* camino punteado hasta la casa */}
          <path d="M150 202q26 4 40-14" stroke={color} strokeWidth="3.5" strokeDasharray="2 9" strokeLinecap="round" fill="none" />
          <g transform="translate(192 140) scale(0.9)">
            <path d="M0 22l20-18 20 18v28h-40z" fill="#fff" stroke={C.tinta} strokeOpacity="0.2" strokeWidth="2" />
            <path d="M-4 24l24-22 24 22" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <rect x="14" y="32" width="12" height="18" rx="2" fill={C.azul} />
          </g>
          <g transform="rotate(-8 120 150)">
            {/* corriendo */}
            {piernas('M104 180l-12 16', 'M136 180q10 4 18 12', [88, 199], [158, 195])}
            {brazo('M80 140q-16-2-24 10')}
            {mano(56, 151)}
            <Caja />
            <Cara animo="feliz" />
            {/* señala la casa */}
            {brazo('M160 134q10-10 18-14')}
            {mano(179, 119)}
          </g>
          <g stroke={C.tinta} strokeOpacity="0.25" strokeWidth="4" strokeLinecap="round">
            <path d="M40 130h18M34 150h16" />
          </g>
        </g>
      )
    case 'ENTREGADO':
      return (
        <g>
          {/* confeti */}
          {[
            [44, 64, C.azul, 20],
            [62, 40, C.verde, -30],
            [168, 30, C.azul, 40],
            [30, 112, C.verde, 60],
            [210, 112, color, -20],
            [150, 52, color, 10],
            [86, 52, '#F59E0B', 70],
            [206, 156, C.azul, 35],
          ].map(([x, y, c, r], i) => (
            <rect key={i} x={x as number} y={y as number} width="9" height="5" rx="1.5" fill={c as string} transform={`rotate(${r} ${x} ${y})`} />
          ))}
          {piernas('M104 180l-4 14', 'M136 180l4 14', [99, 197], [141, 197])}
          {/* brazos arriba */}
          {brazo('M80 134q-16-14-16-36')}
          {mano(64, 96)}
          {brazo('M160 134q16-14 16-36')}
          {mano(176, 96)}
          <Caja />
          <Cara animo="euforico" />
          <Insignia color={color}>
            <path d="M187 56l6 6 11-13" />
          </Insignia>
        </g>
      )
    case 'NO_ENTREGADO':
      return (
        <g>
          {/* puerta cerrada */}
          <g>
            <rect x="18" y="64" width="50" height="138" rx="4" fill="#E7D8C7" stroke={C.tinta} strokeOpacity="0.18" strokeWidth="2" />
            <rect x="26" y="74" width="34" height="46" rx="3" fill="none" stroke={C.tinta} strokeOpacity="0.12" strokeWidth="2" />
            <rect x="26" y="128" width="34" height="62" rx="3" fill="none" stroke={C.tinta} strokeOpacity="0.12" strokeWidth="2" />
            <circle cx="60" cy="134" r="3.5" fill={C.tinta} opacity="0.5" />
          </g>
          {piernasQuietas()}
          {brazo('M80 142q-8 12-6 26')}
          {mano(74, 168)}
          <Caja />
          <Cara animo="triste" />
          {/* lágrima */}
          <path d="M140 148q-3 6 0 8q3-2 0-8z" fill="#7CC4F0" />
          {/* se rasca la cabeza */}
          {brazo('M160 132q20-8 12-34')}
          {mano(170, 98)}
          <Insignia color={color}>
            {/* volveremos: flecha circular */}
            <path d="M205 56a9 9 0 1 1-3-6.7" />
            <path d="M203 44v6h-6" />
          </Insignia>
        </g>
      )
    case 'NOVEDAD':
      return (
        <g>
          {piernasQuietas()}
          {brazo('M80 140q-14 2-18 14')}
          {mano(62, 156)}
          {/* curita en la esquina */}
          <Caja
            cinta={
              <g transform="rotate(-35 90 172)">
                <rect x="76" y="166" width="30" height="11" rx="5.5" fill="#F9D9B5" />
                <rect x="86" y="166" width="10" height="11" fill="#EFC79A" />
              </g>
            }
          />
          <Cara animo="preocupado" />
          {/* gota de sudor */}
          <path d="M160 116q-5 9 0 12q5-3 0-12z" fill="#7CC4F0" />
          {brazo('M160 142q14 2 18 14')}
          {mano(178, 156)}
          {/* aviso */}
          <g transform="translate(196 58)">
            <path d="M0-22l22 38h-44z" fill={color} stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
            <path d="M0-8v12" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="0" cy="10" r="2.8" fill="#fff" />
          </g>
        </g>
      )
    case 'CANCELADO':
      return (
        <g>
          {piernasQuietas(true)}
          {brazo('M80 146q-10 6-8 22', true)}
          {mano(72, 168, true)}
          <Caja
            apagado
            cinta={
              <g opacity="0.85">
                <path d="M84 112l72 62" stroke="#DCD6CC" strokeWidth="9" strokeLinecap="round" />
                <path d="M156 112l-72 62" stroke="#DCD6CC" strokeWidth="9" strokeLinecap="round" />
              </g>
            }
          />
          <Cara animo="dormido" apagado />
          {brazo('M160 146q10 6 8 22', true)}
          {mano(168, 168, true)}
          {/* zzz */}
          <g fill="#94A3B8" fontFamily="inherit" fontWeight="700">
            <text x="62" y="92" fontSize="18">z</text>
            <text x="48" y="74" fontSize="13">z</text>
          </g>
          <Insignia color={color}>
            <path d="M189 49l14 14M203 49l-14 14" />
          </Insignia>
        </g>
      )
  }
}

/**
 * Ilustración grande del estado del envío. `animada` añade un leve vaivén (se desactiva si el sistema
 * pide reducir el movimiento).
 */
export function PersonajeEstado({ estado, className, animada = true }: { estado: Estado; className?: string; animada?: boolean }) {
  const id = useId().replace(/:/g, '')
  const color = COLOR_ESTADO[estado]
  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      aria-hidden="true"
      focusable="false"
      data-estado={estado}
      data-testid="personaje-estado"
    >
      {animada && (
        <style>{`@media (prefers-reduced-motion: no-preference){.${id}-flota{animation:${id}-vaiven 3.2s ease-in-out infinite}}@keyframes ${id}-vaiven{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
      )}
      <circle cx="120" cy="124" r="104" fill={color} opacity="0.12" />
      <circle cx="120" cy="124" r="78" fill={color} opacity="0.08" />
      <ellipse cx="120" cy="206" rx="54" ry="7" fill={C.tinta} opacity="0.1" />
      <g className={`${id}-flota`}>
        <Escena estado={estado} />
      </g>
    </svg>
  )
}
