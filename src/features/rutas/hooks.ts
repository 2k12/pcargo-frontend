import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { CambiosCiudad, CambiosRuta, NuevaRuta } from '@/types/api'
import { ciudadesApi, rutasApi } from './api'

export function useRutas(soloActivas = false) {
  return useQuery({
    queryKey: ['rutas', { soloActivas }],
    queryFn: () => rutasApi.listar(soloActivas),
  })
}

export function useCiudades(soloActivas = false) {
  return useQuery({
    queryKey: ['ciudades', { soloActivas }],
    queryFn: () => ciudadesApi.listar(soloActivas),
    staleTime: 5 * 60_000,
  })
}

/** Cambiar ciudades o rutas afecta qué rutas son operativas y lo que muestra la web pública. */
function invalidarCobertura(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['ciudades'] }),
    qc.invalidateQueries({ queryKey: ['rutas'] }),
    qc.invalidateQueries({ queryKey: ['publico', 'catalogo'] }),
  ])
}

export function useActualizarRuta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: CambiosRuta }) => rutasApi.actualizar(id, cambios),
    onSuccess: () => invalidarCobertura(qc),
  })
}

export function useCrearRuta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NuevaRuta) => rutasApi.crear(data),
    onSuccess: () => invalidarCobertura(qc),
  })
}

export function useCrearCiudad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) => ciudadesApi.crear(nombre),
    onSuccess: () => invalidarCobertura(qc),
  })
}

export function useActualizarCiudad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: CambiosCiudad }) => ciudadesApi.actualizar(id, cambios),
    onSuccess: () => invalidarCobertura(qc),
  })
}

export function useEliminarCiudad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => ciudadesApi.eliminar(id),
    onSuccess: () => invalidarCobertura(qc),
  })
}

export function rutaLabel(r: { origen: string; destino: string }): string {
  return r.origen === r.destino ? `${r.origen} (urbano)` : `${r.origen} → ${r.destino}`
}

/** Nombres de ciudades activas unidos por " · " (p. ej. "Ibarra · Otavalo"). */
export function listaCiudades(ciudades: { nombre: string; activa?: boolean }[] | undefined): string {
  return (ciudades ?? [])
    .filter((c) => c.activa !== false)
    .map((c) => c.nombre)
    .join(' · ')
}
