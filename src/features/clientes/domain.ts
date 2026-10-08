import type { Cliente } from '@/types/api'

/** Solo dígitos: "099 123 4567" y "099-123-4567" son el mismo teléfono (identifica al cliente). */
export const digitos = (telefono: string): string => telefono.replace(/\D/g, '')

/** Minúsculas y sin tildes, para buscar "ferreteria" y encontrar "Ferretería". */
export const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/**
 * Clientes que coinciden con el texto por nombre (sin tildes) o por teléfono (por dígitos).
 * Primero los que empiezan por el texto; luego los que lo contienen.
 */
export function buscarClientes(clientes: Cliente[], texto: string, limite = Infinity): Cliente[] {
  const q = normalizar(texto)
  if (!q) return clientes.slice(0, limite)
  const d = digitos(texto)
  const puntaje = (c: Cliente): number => {
    const nombre = normalizar(c.nombre)
    if (nombre.startsWith(q) || nombre.split(' ').some((p) => p.startsWith(q))) return 2
    if (nombre.includes(q) || (d.length >= 3 && digitos(c.telefono).includes(d))) return 1
    return 0
  }
  return clientes
    .map((c) => ({ c, p: puntaje(c) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || a.c.nombre.localeCompare(b.c.nombre, 'es'))
    .slice(0, limite)
    .map((x) => x.c)
}

/** Cliente registrado con ese teléfono (comparando solo dígitos), si existe. */
export function clientePorTelefono(clientes: Cliente[], telefono: string): Cliente | undefined {
  const d = digitos(telefono)
  return d.length >= 7 ? clientes.find((c) => digitos(c.telefono) === d) : undefined
}

export type OrdenClientes = 'nombre' | 'envios' | 'monto' | 'reciente'

export function ordenarClientes(clientes: Cliente[], orden: OrdenClientes): Cliente[] {
  const lista = [...clientes]
  const porNombre = (a: Cliente, b: Cliente) => a.nombre.localeCompare(b.nombre, 'es')
  switch (orden) {
    case 'envios':
      return lista.sort((a, b) => b.envios - a.envios || porNombre(a, b))
    case 'monto':
      return lista.sort((a, b) => b.monto - a.monto || porNombre(a, b))
    case 'reciente':
      return lista.sort((a, b) => (b.ultimoEnvio ?? '').localeCompare(a.ultimoEnvio ?? '') || porNombre(a, b))
    default:
      return lista.sort(porNombre)
  }
}
