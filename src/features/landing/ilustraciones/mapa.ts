import type { Ciudad, Ruta } from '@/types/api'

/** Coordenadas aproximadas (lat, lon) de ciudades del norte del Ecuador, para el mapa de cobertura. */
export const COORDENADAS: Record<string, [number, number]> = {
  ibarra: [0.3517, -78.1223],
  atuntaqui: [0.3326, -78.214],
  otavalo: [0.2341, -78.2611],
  quito: [-0.1807, -78.4678],
  cotacachi: [0.301, -78.2643],
  cayambe: [0.0413, -78.145],
  urcuqui: [0.418, -78.196],
  pimampiro: [0.3904, -77.94],
  'san antonio de ibarra': [0.3376, -78.169],
  tabacundo: [0.049, -78.205],
  'san gabriel': [0.5943, -77.8358],
  tulcan: [0.8118, -77.7173],
  'el angel': [0.6175, -77.9406],
  sangolqui: [-0.3126, -78.4455],
  'mitad del mundo': [-0.0022, -78.4558],
  guayllabamba: [-0.0569, -78.3383],
}

/** Volcanes de referencia (decorativos, se dibujan si caen dentro del encuadre). */
export const VOLCANES: { nombre: string; coord: [number, number] }[] = [
  { nombre: 'Imbabura', coord: [0.2586, -78.1834] },
  { nombre: 'Cotacachi', coord: [0.3617, -78.3486] },
  { nombre: 'Cayambe', coord: [0.0292, -77.9864] },
]

export const normalizarNombre = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')

export interface PuntoMapa {
  ciudad: Ciudad
  x: number
  y: number
}

export interface Encuadre {
  ancho: number
  alto: number
  proyectar: (coord: [number, number]) => { x: number; y: number }
}

/**
 * Ubica las ciudades conocidas en un lienzo de `ancho` px con proyección equirectangular
 * (válida cerca de la línea ecuatorial). Las ciudades sin coordenadas se devuelven aparte.
 */
export function ubicarCiudades(
  ciudades: Ciudad[],
  ancho = 440,
): { puntos: PuntoMapa[]; sinUbicar: Ciudad[]; encuadre: Encuadre | null } {
  const conCoord = ciudades
    .map((c) => ({ c, coord: COORDENADAS[normalizarNombre(c.nombre)] }))
    .filter((x): x is { c: Ciudad; coord: [number, number] } => !!x.coord)
  const sinUbicar = ciudades.filter((c) => !COORDENADAS[normalizarNombre(c.nombre)])
  if (conCoord.length === 0) return { puntos: [], sinUbicar, encuadre: null }

  const lats = conCoord.map((x) => x.coord[0])
  const lons = conCoord.map((x) => x.coord[1])
  const MIN_SPAN = 0.35
  let [latMin, latMax] = [Math.min(...lats), Math.max(...lats)]
  let [lonMin, lonMax] = [Math.min(...lons), Math.max(...lons)]
  const expandir = (min: number, max: number) => {
    const span = Math.max(max - min, MIN_SPAN)
    const centro = (min + max) / 2
    const pad = span * 0.28
    return [centro - span / 2 - pad, centro + span / 2 + pad] as const
  }
  ;[latMin, latMax] = expandir(latMin, latMax)
  ;[lonMin, lonMax] = expandir(lonMin, lonMax)

  const escala = ancho / (lonMax - lonMin)
  // Esquemático: si el territorio es muy alargado se comprime en vertical para no dejar un lienzo vacío.
  const alto = Math.round(Math.min(Math.max((latMax - latMin) * escala, 300), 420))
  const escalaY = Math.min(escala, alto / (latMax - latMin))
  const latCentro = (latMin + latMax) / 2
  const proyectar = ([lat, lon]: [number, number]) => ({
    x: (lon - lonMin) * escala,
    y: alto / 2 - (lat - latCentro) * escalaY,
  })

  return {
    puntos: conCoord.map(({ c, coord }) => ({ ciudad: c, ...proyectar(coord) })),
    sinUbicar,
    encuadre: { ancho, alto, proyectar },
  }
}

/** Pares de ciudades conectadas por al menos una ruta interurbana (sin duplicar sentido). */
export function conexiones(rutas: Ruta[]): [number, number][] {
  const vistos = new Set<string>()
  const pares: [number, number][] = []
  for (const r of rutas) {
    if (r.origen.id === r.destino.id) continue
    const [a, b] = [r.origen.id, r.destino.id].sort((x, y) => x - y) as [number, number]
    const k = `${a}-${b}`
    if (!vistos.has(k)) {
      vistos.add(k)
      pares.push([a, b])
    }
  }
  return pares
}
