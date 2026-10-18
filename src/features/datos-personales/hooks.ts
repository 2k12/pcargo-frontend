import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NuevaSolicitudDatos } from '@/types/api'
import { datosPersonalesApi } from './api'

export const datosKeys = {
  all: ['datos-personales'] as const,
  politica: ['datos-personales', 'politica'] as const,
  solicitudes: (pagina: number) => ['datos-personales', 'solicitudes', pagina] as const,
}

export function usePoliticaDatos() {
  return useQuery({ queryKey: datosKeys.politica, queryFn: datosPersonalesApi.politica })
}

export function useGuardarPolitica() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (meses: number) => datosPersonalesApi.guardarPolitica(meses),
    onSuccess: (p) => qc.setQueryData(datosKeys.politica, p),
  })
}

/** Simula (solo cuenta) o ejecuta la depuración. Al ejecutarla cambian envíos, clientes y el resumen. */
export function useDepurar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (simular: boolean) => datosPersonalesApi.depurar(simular),
    onSuccess: (r) => {
      if (r.simulado) return
      for (const key of [datosKeys.all, ['envios'], ['clientes'], ['dashboard']]) qc.invalidateQueries({ queryKey: key })
    },
  })
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
