import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FiltroResumen, Resumen } from '@/types/api'

export const dashboardApi = {
  resumen: (f: FiltroResumen = {}) =>
    api.get<Resumen>('/dashboard/resumen', { clienteId: f.clienteId, desde: f.desde, hasta: f.hasta }),
}

export function useResumen(filtro: FiltroResumen = {}) {
  return useQuery({
    queryKey: ['dashboard', 'resumen', filtro],
    queryFn: () => dashboardApi.resumen(filtro),
    // Al cambiar de filtro se mantienen las cifras anteriores mientras llegan las nuevas (sin parpadeo).
    placeholderData: keepPreviousData,
    // El panel queda abierto en la oficina: se refresca solo cada minuto.
    refetchInterval: 60_000,
  })
}
