import type { Ruta } from '@/types/api'

/** Cuántas rutas (en cualquier sentido, incluida la urbana) usan cada ciudad. */
export function contarRutasPorCiudad(rutas: Ruta[]): Map<number, number> {
  const conteo = new Map<number, number>()
  for (const r of rutas) {
    conteo.set(r.origen.id, (conteo.get(r.origen.id) ?? 0) + 1)
    if (r.destino.id !== r.origen.id) conteo.set(r.destino.id, (conteo.get(r.destino.id) ?? 0) + 1)
  }
  return conteo
}
