import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Seguimiento } from '@/types/api'

export const seguimientoApi = {
  consultar: (codigo: string) => api.get<Seguimiento>(`/seguimiento/${encodeURIComponent(codigo)}`),
}

export function useSeguimiento(codigo: string | undefined) {
  return useQuery({
    queryKey: ['seguimiento', codigo],
    queryFn: () => seguimientoApi.consultar(codigo!),
    enabled: !!codigo,
    retry: false,
  })
}
