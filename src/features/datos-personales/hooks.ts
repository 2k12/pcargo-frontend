import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NuevaSolicitudDatos } from '@/types/api'
import { datosPersonalesApi } from './api'

export const datosKeys = {
  all: ['datos-personales'] as const,
  solicitudes: (pagina: number) => ['datos-personales', 'solicitudes', pagina] as const,
}

export function useSolicitudesDatos(pagina: number) {
  return useQuery({
    queryKey: datosKeys.solicitudes(pagina),
    queryFn: () => datosPersonalesApi.solicitudes(pagina),
    placeholderData: keepPreviousData,
  })
}

export function useAtenderSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NuevaSolicitudDatos) => datosPersonalesApi.atender(data),
    onSuccess: () => {
      for (const key of [datosKeys.all, ['envios'], ['clientes'], ['usuarios'], ['dashboard']]) qc.invalidateQueries({ queryKey: key })
    },
  })
}
