/** Tamaños de página que se ofrecen en las tablas paginadas en el servidor. */
export const OPCIONES_POR_PAGINA = [10, 20, 50] as const

/** Rango visible "21–40": vacío si no hay resultados. */
export function rangoPagina(pagina: number, porPagina: number, total: number): { desde: number; hasta: number } {
  if (total === 0) return { desde: 0, hasta: 0 }
  const desde = (pagina - 1) * porPagina + 1
  return { desde: Math.min(desde, total), hasta: Math.min(pagina * porPagina, total) }
}
