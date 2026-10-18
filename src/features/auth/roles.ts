// Roles (contrato v12) y el espacio de la aplicación que corresponde a cada uno.
import type { Rol } from '@/types/api'

export const ROLES: Rol[] = ['ADMIN', 'OPERADOR', 'REPARTIDOR', 'CLIENTE']

export const ROL_LABEL: Record<Rol, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  REPARTIDOR: 'Repartidor',
  CLIENTE: 'Cliente (portal)',
}

/** Roles que usan el panel de operación. */
export const ROLES_PANEL: Rol[] = ['ADMIN', 'OPERADOR']

export const esPersonalPanel = (rol: Rol | undefined | null): boolean => !!rol && ROLES_PANEL.includes(rol)

/** Página de inicio de cada rol después del login. */
export function espacioDeRol(rol: Rol): string {
  if (rol === 'REPARTIDOR') return '/repartidor'
  if (rol === 'CLIENTE') return '/portal'
  return '/panel'
}

const enEspacio = (ruta: string, base: string) => ruta === base || ruta.startsWith(`${base}/`)

/** ¿Puede el rol abrir esta ruta privada? (el servidor aplica los permisos igualmente). */
export function rutaPermitida(rol: Rol, ruta: string): boolean {
  const repartidor = enEspacio(ruta, '/repartidor')
  const portal = enEspacio(ruta, '/portal')
  if (rol === 'REPARTIDOR') return repartidor
  if (rol === 'CLIENTE') return portal
  return !repartidor && !portal
}

/** A dónde ir tras iniciar sesión: la ruta pedida si el rol puede verla; si no, su espacio. */
export function destinoTrasLogin(rol: Rol, desde?: string | null): string {
  return desde && desde !== '/login' && rutaPermitida(rol, desde) ? desde : espacioDeRol(rol)
}

/**
 * A dónde lleva el QR de una guía (`/seguimiento/<n>`) si quien lo escanea tiene la sesión abierta: el personal
 * va al envío en el panel y el repartidor a su app; el cliente del portal (y sin sesión) ve el rastreo público (null).
 */
export function destinoGuiaConSesion(rol: Rol, numeroGuia: string): string | null {
  if (esPersonalPanel(rol)) return `/envios?guia=${numeroGuia}`
  if (rol === 'REPARTIDOR') return `/repartidor?guia=${numeroGuia}`
  return null
}
