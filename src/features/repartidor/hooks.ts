import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EstadoReparto, VistaReparto } from '@/types/api'
import { repartidorApi } from './api'

export const repartoKeys = {
  all: ['reparto'] as const,
  envios: (vista: VistaReparto) => ['reparto', 'envios', vista] as const,
  caja: ['reparto', 'caja'] as const,
}

export function useEnviosReparto(vista: VistaReparto) {
  return useQuery({
    queryKey: repartoKeys.envios(vista),
    queryFn: () => repartidorApi.envios(vista),
    // En la calle la lista cambia (asignaciones nuevas): se refresca al volver a la app.
    refetchOnWindowFocus: true,
  })
}

export function useCajaReparto() {
  return useQuery({ queryKey: repartoKeys.caja, queryFn: repartidorApi.caja })
}

/** Tras cualquier cambio se refrescan las listas y la caja (una entrega «Al cobro» genera un cobro). */
export function useCambiarEstadoReparto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado, nota }: { id: string; estado: EstadoReparto; nota?: string }) =>
      repartidorApi.cambiarEstado(id, estado, nota),
    onSuccess: () => qc.invalidateQueries({ queryKey: repartoKeys.all }),
  })
}

export function useSubirEvidenciaReparto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, foto, nombreArchivo, recibidoPor }: { id: string; foto: Blob; nombreArchivo: string; recibidoPor: string }) =>
      repartidorApi.subirEvidencia(id, foto, nombreArchivo, recibidoPor),
    onSuccess: () => qc.invalidateQueries({ queryKey: repartoKeys.all }),
  })
}
