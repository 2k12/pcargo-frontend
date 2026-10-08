import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CambiosRuta, NuevaRuta } from '@/types/api'
import { rutasApi } from './api'

export function useRutas(soloActivas = false) {
  return useQuery({
    queryKey: ['rutas', { soloActivas }],
    queryFn: () => rutasApi.listar(soloActivas),
  })
}

export function useCiudades() {
  return useQuery({ queryKey: ['ciudades'], queryFn: rutasApi.ciudades, staleTime: Infinity })
}

export function useActualizarRuta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cambios }: { id: number; cambios: CambiosRuta }) => rutasApi.actualizar(id, cambios),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rutas'] }),
  })
}

export function useCrearRuta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NuevaRuta) => rutasApi.crear(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rutas'] }),
  })
}

export function rutaLabel(r: { origen: string; destino: string }): string {
  return r.origen === r.destino ? `${r.origen} (urbano)` : `${r.origen} → ${r.destino}`
}
