import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CotizacionRequest, Estado, FiltrosEnvios, NuevoEnvio } from '@/types/api'
import { enviosApi } from './api'
import { TIPOS_CARGA_DEFAULT } from './domain'

export const enviosKeys = {
  all: ['envios'] as const,
  list: (f: FiltrosEnvios) => ['envios', 'list', f] as const,
  detail: (id: string) => ['envios', 'detail', id] as const,
}

export function useEnvios(filtros: FiltrosEnvios) {
  return useQuery({
    queryKey: enviosKeys.list(filtros),
    queryFn: () => enviosApi.listar(filtros),
    placeholderData: keepPreviousData,
  })
}

export function useEnvio(id: string | null) {
  return useQuery({
    queryKey: enviosKeys.detail(id ?? ''),
    queryFn: () => enviosApi.obtener(id!),
    enabled: !!id,
  })
}

export function useTiposCarga() {
  return useQuery({
    queryKey: ['tipos-carga'],
    queryFn: enviosApi.tiposCarga,
    staleTime: Infinity,
    placeholderData: TIPOS_CARGA_DEFAULT,
  })
}

export function useCotizacion(req: CotizacionRequest | null) {
  return useQuery({
    queryKey: ['cotizacion', req],
    queryFn: () => enviosApi.cotizar(req!),
    enabled: !!req,
    placeholderData: keepPreviousData,
    retry: false,
  })
}

export function useCrearEnvio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NuevoEnvio) => enviosApi.crear(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: enviosKeys.all })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useCambiarEstado(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ estado, nota }: { estado: Estado; nota?: string }) =>
      enviosApi.cambiarEstado(id, estado, nota),
    onSuccess: (envio) => {
      qc.setQueryData(enviosKeys.detail(id), envio)
      qc.invalidateQueries({ queryKey: ['envios', 'list'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
