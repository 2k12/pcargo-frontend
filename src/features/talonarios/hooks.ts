import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FiltroTalonarios, NuevoTalonario } from '@/types/api'
import { talonariosApi } from './api'

export const talonariosKeys = {
  all: ['talonarios'] as const,
  list: (f: { estado: FiltroTalonarios; pagina: number; porPagina: number }) => ['talonarios', 'list', f] as const,
  detail: (id: string) => ['talonarios', 'detail', id] as const,
  guia: (numero: string) => ['talonarios', 'guia', numero] as const,
}

export function useTalonarios(f: { estado: FiltroTalonarios; pagina: number; porPagina: number }) {
  return useQuery({
    queryKey: talonariosKeys.list(f),
    queryFn: () => talonariosApi.listar(f),
    placeholderData: keepPreviousData,
  })
}

export function useTalonario(id: string | undefined) {
  return useQuery({
    queryKey: talonariosKeys.detail(id ?? ''),
    queryFn: () => talonariosApi.obtener(id!),
    enabled: !!id,
  })
}

/** Guía de talonario con ese número (null si no es de ninguno). Solo se consulta con un número válido. */
export function useGuiaTalonario(numero: string | null) {
  return useQuery({
    queryKey: talonariosKeys.guia(numero ?? ''),
    queryFn: () => talonariosApi.porGuia(numero!),
    enabled: !!numero,
    retry: false,
  })
}

export function useCrearTalonario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NuevoTalonario) => talonariosApi.crear(data),
    onSuccess: (t) => {
      qc.setQueryData(talonariosKeys.detail(t.id), t)
      qc.invalidateQueries({ queryKey: ['talonarios', 'list'] })
    },
  })
}

export function useAnularGuia(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ numeroGuia, motivo }: { numeroGuia: number; motivo: string }) => talonariosApi.anular(id, numeroGuia, motivo),
    onSuccess: (t) => {
      qc.setQueryData(talonariosKeys.detail(id), t)
      qc.invalidateQueries({ queryKey: ['talonarios', 'list'] })
      qc.invalidateQueries({ queryKey: ['talonarios', 'guia'] })
    },
  })
}
