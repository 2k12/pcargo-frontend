import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FiltroCierres, NuevoCierreCaja } from '@/types/api'
import { cajaApi } from './api'

export const cajaKeys = {
  all: ['caja'] as const,
  pendientes: ['caja', 'pendientes'] as const,
  pendiente: (usuarioId: string) => ['caja', 'pendientes', usuarioId] as const,
  cierres: (f: FiltroCierres) => ['caja', 'cierres', f] as const,
  cierre: (id: string) => ['caja', 'cierre', id] as const,
}

export function usePendientes() {
  return useQuery({ queryKey: cajaKeys.pendientes, queryFn: cajaApi.pendientes })
}

/** Cobros pendientes de una persona (con la lista de cobros). */
export function usePendiente(usuarioId: string | null) {
  return useQuery({
    queryKey: cajaKeys.pendiente(usuarioId ?? ''),
    queryFn: () => cajaApi.pendiente(usuarioId!),
    enabled: !!usuarioId,
  })
}

export function useCierres(filtro: FiltroCierres) {
  return useQuery({ queryKey: cajaKeys.cierres(filtro), queryFn: () => cajaApi.cierres(filtro), placeholderData: keepPreviousData })
}

export function useCierre(id: string | null) {
  return useQuery({ queryKey: cajaKeys.cierre(id ?? ''), queryFn: () => cajaApi.cierre(id!), enabled: !!id })
}

export function useCerrarCaja() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NuevoCierreCaja) => cajaApi.cerrar(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: cajaKeys.all }),
  })
}
