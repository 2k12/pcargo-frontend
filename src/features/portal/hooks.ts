import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { registrarTiposCarga } from '@/features/envios/domain'
import type { FiltrosEnviosPortal, NuevoEnvioPortal } from '@/types/api'
import { portalApi } from './api'

export const portalKeys = {
  all: ['portal'] as const,
  resumen: (rango: { desde?: string; hasta?: string }) => ['portal', 'resumen', rango] as const,
  catalogo: ['portal', 'catalogo'] as const,
  envios: (f: FiltrosEnviosPortal) => ['portal', 'envios', f] as const,
  envio: (id: string) => ['portal', 'envio', id] as const,
}

/** Resumen del periodo; sin rango, el mes en curso (también da el nombre y los datos de la empresa). */
export function useResumenPortal(rango: { desde?: string; hasta?: string } = {}, habilitado = true) {
  return useQuery({
    queryKey: portalKeys.resumen(rango),
    queryFn: () => portalApi.resumen(rango),
    enabled: habilitado,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

/** Datos de la empresa vinculada (los trae el resumen del mes en curso). */
export function useClientePortal() {
  const { data } = useResumenPortal()
  return data?.cliente
}

export function useCatalogoPortal() {
  return useQuery({
    queryKey: portalKeys.catalogo,
    queryFn: async () => {
      const c = await portalApi.catalogo()
      registrarTiposCarga(c.tiposCarga)
      return c
    },
    staleTime: 5 * 60_000,
  })
}

export function useEnviosPortal(f: FiltrosEnviosPortal) {
  return useQuery({ queryKey: portalKeys.envios(f), queryFn: () => portalApi.envios(f), placeholderData: keepPreviousData })
}

export function useEnvioPortal(id: string | null) {
  return useQuery({ queryKey: portalKeys.envio(id ?? ''), queryFn: () => portalApi.envio(id!), enabled: !!id })
}

export function useCrearEnvioPortal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NuevoEnvioPortal) => portalApi.crear(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: portalKeys.all }),
  })
}
