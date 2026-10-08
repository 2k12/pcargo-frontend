import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Seguimiento } from '@/types/api'

export const seguimientoApi = {
  consultar: (numeroGuia: string) => api.get<Seguimiento>(`/seguimiento/${encodeURIComponent(numeroGuia)}`),
}

export function useSeguimiento(numeroGuia: string | undefined) {
  return useQuery({
    queryKey: ['seguimiento', numeroGuia],
    queryFn: () => seguimientoApi.consultar(numeroGuia!),
    enabled: !!numeroGuia,
    retry: false,
  })
}
