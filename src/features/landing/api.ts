import { useQuery } from '@tanstack/react-query'
import { registrarTiposCarga } from '@/features/envios/domain'
import { api } from '@/lib/api'
import type { ArticuloRestringido, CatalogoPublico, Cotizacion, CotizacionRequest, TipoCarga } from '@/types/api'

export const publicoApi = {
  catalogo: async () => {
    const c = await api.get<CatalogoPublico>('/publico/catalogo')
    registrarTiposCarga(c.tiposCarga ?? [])
    // El backend publica solo los tipos activos y sin `activo` (TipoCargaPublico, contrato v11). Si por error llegara
    // un tipo marcado como inactivo, no se ofrece.
    return Array.isArray(c.tiposCarga)
      ? { ...c, tiposCarga: c.tiposCarga.filter((t) => (t as Partial<TipoCarga>).activo !== false) }
      : c
  },
  cotizar: (data: CotizacionRequest) => api.post<Cotizacion>('/publico/cotizar', data),
  /** «Qué no transportamos» (contrato v11): solo activos, por categoría y orden. */
  articulosRestringidos: async () => {
    const r = await api.get<ArticuloRestringido[]>('/publico/articulos-restringidos')
    if (!Array.isArray(r)) throw new Error('Respuesta inesperada de artículos restringidos')
    return r
  },
}

/** Claves públicas: el panel las invalida al guardar el catálogo (contrato v11). */
export const publicoKeys = {
  all: ['publico'] as const,
  catalogo: ['publico', 'catalogo'] as const,
  articulos: ['publico', 'articulos-restringidos'] as const,
}

export function useCatalogoPublico() {
  return useQuery({ queryKey: publicoKeys.catalogo, queryFn: publicoApi.catalogo, staleTime: 5 * 60_000 })
}

export function useArticulosPublicos() {
  return useQuery({
    queryKey: publicoKeys.articulos,
    queryFn: publicoApi.articulosRestringidos,
    staleTime: 5 * 60_000,
    // Si falla, la landing muestra la lista base sin insistir (el límite de tasa de /publico/* es de 60/min).
    retry: false,
  })
}

export function useCotizacionPublica(req: CotizacionRequest | null) {
  return useQuery({
    queryKey: ['publico', 'cotizar', req],
    queryFn: () => publicoApi.cotizar(req!),
    enabled: !!req,
    retry: false,
  })
}
