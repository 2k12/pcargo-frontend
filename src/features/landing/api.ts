import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CatalogoPublico, Cotizacion, CotizacionRequest } from '@/types/api'

export const publicoApi = {
  catalogo: () => api.get<CatalogoPublico>('/publico/catalogo'),
  cotizar: (data: CotizacionRequest) => api.post<Cotizacion>('/publico/cotizar', data),
}

export function useCatalogoPublico() {
  return useQuery({ queryKey: ['publico', 'catalogo'], queryFn: publicoApi.catalogo, staleTime: 5 * 60_000 })
}

export function useCotizacionPublica(req: CotizacionRequest | null) {
  return useQuery({
    queryKey: ['publico', 'cotizar', req],
    queryFn: () => publicoApi.cotizar(req!),
    enabled: !!req,
    retry: false,
  })
}
