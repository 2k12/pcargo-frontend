import type { Ciudad, Ruta } from '@/types/api'

/** Busca la ruta activa entre dos ciudades (origen = destino → ruta urbana). */
export function buscarRuta(rutas: Ruta[], origenId: number, destinoId: number): Ruta | undefined {
  return rutas.find((r) => r.origen.id === origenId && r.destino.id === destinoId)
}

export interface CeldaMatriz {
  origen: Ciudad
  destino: Ciudad
  ruta: Ruta | undefined
}

/** Matriz origen × destino de rutas (tiempos estimados) para la tabla de cobertura; la ruta no fija el precio. */
export function matrizRutas(ciudades: Ciudad[], rutas: Ruta[]): CeldaMatriz[][] {
  return ciudades.map((origen) =>
    ciudades.map((destino) => ({ origen, destino, ruta: buscarRuta(rutas, origen.id, destino.id) })),
  )
}

/**
 * Resumen corto de cobertura para la cápsula de la portada: los extremos de la red y cuántas ciudades hay
 * (p. ej. "Ibarra ⇄ Quito · 7 ciudades"). Los extremos son la ruta interurbana operativa más larga;
 * si una de ellas es `base` (la ciudad de la oficina), va primero.
 */
export function resumenCobertura(ciudades: Ciudad[], rutas: Ruta[], base?: string): string {
  const activas = ciudades.filter((c) => c.activa)
  if (activas.length <= 1) return activas[0]?.nombre ?? ''
  const cantidad = `${activas.length} ciudades`
  const larga = rutas
    .filter((r) => r.operativa && r.origen.id !== r.destino.id)
    .reduce<Ruta | undefined>((max, r) => (!max || r.tiempoEstimadoMin > max.tiempoEstimadoMin ? r : max), undefined)
  if (!larga) return cantidad
  const [a, b] = larga.destino.nombre === base ? [larga.destino, larga.origen] : [larga.origen, larga.destino]
  return `${a.nombre} ⇄ ${b.nombre} · ${cantidad}`
}
