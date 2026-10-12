import {
  Apple,
  Ban,
  Banknote,
  BatteryWarning,
  Bomb,
  Crosshair,
  Droplets,
  Flame,
  FlaskConical,
  Gem,
  PawPrint,
  Pill,
  ReceiptText,
  Smartphone,
  Sprout,
  Syringe,
  TriangleAlert,
  Wine,
  type LucideIcon,
} from 'lucide-react'
import type { IconoArticulo } from '@/types/api'

/**
 * Mapa único `IconoArticulo` → icono lucide (contrato v11). Lo usan la landing («Qué no transportamos»),
 * el panel del ADMIN (rejilla para elegir) y la vista previa. Las NOTA no llevan icono.
 */
export const ICONOS_ARTICULO: Record<IconoArticulo, { icon: LucideIcon; nombre: string }> = {
  dinero: { icon: Banknote, nombre: 'Dinero' },
  documento: { icon: ReceiptText, nombre: 'Documento de valor' },
  joya: { icon: Gem, nombre: 'Joya' },
  arma: { icon: Crosshair, nombre: 'Arma' },
  explosivo: { icon: Bomb, nombre: 'Explosivo' },
  fuego: { icon: Flame, nombre: 'Inflamable' },
  quimico: { icon: FlaskConical, nombre: 'Químico' },
  droga: { icon: Pill, nombre: 'Droga' },
  animal: { icon: PawPrint, nombre: 'Animal' },
  prohibido: { icon: Ban, nombre: 'Prohibido' },
  perecible: { icon: Apple, nombre: 'Perecible' },
  liquido: { icon: Droplets, nombre: 'Líquido' },
  fragil: { icon: Wine, nombre: 'Frágil' },
  bateria: { icon: BatteryWarning, nombre: 'Batería' },
  planta: { icon: Sprout, nombre: 'Planta' },
  medicina: { icon: Syringe, nombre: 'Medicina' },
  electronico: { icon: Smartphone, nombre: 'Electrónico' },
  alerta: { icon: TriangleAlert, nombre: 'Alerta' },
}

export const LISTA_ICONOS_ARTICULO = Object.keys(ICONOS_ARTICULO) as IconoArticulo[]

/** Icono de un artículo; sin icono (o uno desconocido) se usa el de «prohibido» o el de «alerta» según la categoría. */
export function iconoArticulo(icono: IconoArticulo | null | undefined, porDefecto: IconoArticulo = 'prohibido'): LucideIcon {
  return (icono && ICONOS_ARTICULO[icono]?.icon) || ICONOS_ARTICULO[porDefecto].icon
}
