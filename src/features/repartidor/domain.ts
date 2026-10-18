// App del repartidor (contrato v12): lógica pura para la calle (enlaces, QR, agrupación, acciones).
import { transicionesPermitidas } from '@/features/envios/domain'
// El QR de la guía se interpreta igual en el panel y en la app del repartidor.
export { numeroGuiaDesdeQr } from '@/features/envios/guia'
import type { EnvioReparto, Estado, EstadoReparto } from '@/types/api'

/** Solo dígitos y el «+» inicial, para `tel:`. */
export function enlaceTelefono(telefono: string): string {
  const limpio = telefono.trim()
  return `tel:${limpio.startsWith('+') ? '+' : ''}${limpio.replace(/\D/g, '')}`
}

/**
 * Enlace de WhatsApp con el código de Ecuador: `0991234567` → `https://wa.me/593991234567`.
 * Si ya viene con 593 (o +593) se respeta. Devuelve null si el número no sirve.
 */
export function enlaceWhatsApp(telefono: string, mensaje?: string): string | null {
  let d = telefono.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (!d.startsWith('593')) d = `593${d.replace(/^0+/, '')}`
  if (d.length < 11 || d.length > 15) return null
  return `https://wa.me/${d}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`
}

/** Búsqueda en Google Maps de la dirección en su ciudad. */
export function enlaceMapa(direccion: string, ciudad: string): string {
  const q = [direccion.trim(), ciudad.trim(), 'Ecuador'].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export interface GrupoDestino {
  destino: string
  envios: EnvioReparto[]
  porCobrar: number
}

/** Agrupa por ciudad de destino conservando el orden del servidor (destino y número de guía). */
export function agruparPorDestino(envios: EnvioReparto[]): GrupoDestino[] {
  const grupos = new Map<string, GrupoDestino>()
  for (const e of envios) {
    const destino = e.ruta.destino
    const g = grupos.get(destino) ?? { destino, envios: [], porCobrar: 0 }
    g.envios.push(e)
    g.porCobrar = Math.round((g.porCobrar + e.porCobrar) * 100) / 100
    grupos.set(destino, g)
  }
  return [...grupos.values()]
}

const ESTADOS_REPARTO: EstadoReparto[] = ['EN_REPARTO', 'ENTREGADO', 'NO_ENTREGADO', 'NOVEDAD']

/** Estados a los que el repartidor puede llevar el envío (mismas transiciones que el panel). */
export function accionesReparto(estado: Estado): EstadoReparto[] {
  return transicionesPermitidas(estado).filter((e): e is EstadoReparto => (ESTADOS_REPARTO as Estado[]).includes(e))
}

/** Texto del botón según el estado de origen. */
export function etiquetaAccion(desde: Estado, hacia: EstadoReparto): string {
  if (hacia === 'EN_REPARTO') return desde === 'EN_TRANSITO' ? 'Salir a reparto' : 'Reintentar'
  if (hacia === 'ENTREGADO') return 'Entregado'
  if (hacia === 'NO_ENTREGADO') return 'No entregado'
  return 'Novedad'
}

/** Total por cobrar de una lista. */
export const totalPorCobrar = (envios: Pick<EnvioReparto, 'porCobrar'>[]): number =>
  Math.round(envios.reduce((s, e) => s + e.porCobrar, 0) * 100) / 100
