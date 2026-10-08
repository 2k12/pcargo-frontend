import type { Ciudad, Ruta } from '@/types/api'

/** Busca la ruta activa entre dos ciudades (origen = destino → ruta urbana). */
export function buscarRuta(rutas: Ruta[], origenId: number, destinoId: number): Ruta | undefined {
  return rutas.find((r) => r.origen.id === origenId && r.destino.id === destinoId)
}

/** Tarifa base más baja ofrecida, para el mensaje "desde $X". */
export function tarifaDesde(rutas: Ruta[]): number | null {
  return rutas.length ? Math.min(...rutas.map((r) => r.tarifaBase)) : null
}

export interface CeldaMatriz {
  origen: Ciudad
  destino: Ciudad
  ruta: Ruta | undefined
}

/** Matriz origen × destino de tarifas para la tabla de cobertura. */
export function matrizTarifas(ciudades: Ciudad[], rutas: Ruta[]): CeldaMatriz[][] {
  return ciudades.map((origen) =>
    ciudades.map((destino) => ({ origen, destino, ruta: buscarRuta(rutas, origen.id, destino.id) })),
  )
}
