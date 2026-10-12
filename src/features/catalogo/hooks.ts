import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { registrarTiposCarga } from '@/features/envios/domain'
import { TIPOS_CARGA_KEY } from '@/features/envios/hooks'
import { publicoKeys } from '@/features/landing/api'
import type { ArticuloRestringido, CategoriaArticulo, DatosArticulo, DatosTipoCarga, FiltroHistorialTipos, NuevoTipoCarga, TipoCarga } from '@/types/api'
import { catalogoApi } from './api'

export const catalogoKeys = {
  /** Debajo de `['tipos-carga']`: invalidar esa clave refresca la lista activa, la del ADMIN y el historial. */
  tiposTodos: [...TIPOS_CARGA_KEY, 'todos'] as const,
  historial: (f: FiltroHistorialTipos) => [...TIPOS_CARGA_KEY, 'historial', f] as const,
  articulos: ['articulos-restringidos'] as const,
}

/**
 * Tras guardar el catálogo: refresca tipos (panel), artículos, el catálogo y los artículos públicos de la landing
 * y las cotizaciones en caché (el backend ya invalidó su propia caché).
 */
export function invalidarCatalogo(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: TIPOS_CARGA_KEY }),
    qc.invalidateQueries({ queryKey: catalogoKeys.articulos }),
    qc.invalidateQueries({ queryKey: publicoKeys.all }),
    qc.invalidateQueries({ queryKey: ['cotizacion'] }),
  ])
}

export function useTiposCargaTodos() {
  return useQuery({
    queryKey: catalogoKeys.tiposTodos,
    queryFn: async () => {
      const tipos = await catalogoApi.tiposTodos()
      registrarTiposCarga(tipos)
      return [...tipos].sort((a, b) => a.orden - b.orden)
    },
  })
}

export function useCrearTipoCarga() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: NuevoTipoCarga) => catalogoApi.crearTipo(datos),
    onSuccess: () => invalidarCatalogo(qc),
  })
}

export function useActualizarTipoCarga() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ codigo, cambios }: { codigo: string; cambios: Partial<DatosTipoCarga> }) => catalogoApi.actualizarTipo(codigo, cambios),
    onSuccess: () => invalidarCatalogo(qc),
  })
}

export function useEliminarTipoCarga() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (codigo: string) => catalogoApi.eliminarTipo(codigo),
    onSuccess: () => invalidarCatalogo(qc),
  })
}

/** Reordena en bloque; la lista se mueve al instante y vuelve atrás si el servidor lo rechaza. */
export function useOrdenarTipos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (codigos: string[]) => catalogoApi.ordenarTipos(codigos),
    onMutate: async (codigos) => {
      await qc.cancelQueries({ queryKey: catalogoKeys.tiposTodos })
      const previo = qc.getQueryData<TipoCarga[]>(catalogoKeys.tiposTodos)
      if (previo) {
        const porCodigo = new Map(previo.map((t) => [t.codigo, t]))
        qc.setQueryData<TipoCarga[]>(
          catalogoKeys.tiposTodos,
          codigos.flatMap((c, i) => {
            const t = porCodigo.get(c)
            return t ? [{ ...t, orden: i + 1 }] : []
          }),
        )
      }
      return { previo }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previo) qc.setQueryData(catalogoKeys.tiposTodos, ctx.previo)
    },
    onSettled: () => invalidarCatalogo(qc),
  })
}

export function useHistorialTipos(f: FiltroHistorialTipos) {
  return useQuery({
    queryKey: catalogoKeys.historial(f),
    queryFn: () => catalogoApi.historial(f),
    placeholderData: keepPreviousData,
  })
}

export function useArticulosAdmin() {
  return useQuery({ queryKey: catalogoKeys.articulos, queryFn: catalogoApi.articulos })
}

export function useCrearArticulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (datos: DatosArticulo) => catalogoApi.crearArticulo(datos),
    onSuccess: () => invalidarCatalogo(qc),
  })
}

export function useActualizarArticulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: Partial<DatosArticulo> }) => catalogoApi.actualizarArticulo(id, cambios),
    onSuccess: () => invalidarCatalogo(qc),
  })
}

export function useEliminarArticulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => catalogoApi.eliminarArticulo(id),
    onSuccess: () => invalidarCatalogo(qc),
  })
}

export function useOrdenarArticulos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ categoria, ids }: { categoria: CategoriaArticulo; ids: string[] }) => catalogoApi.ordenarArticulos(categoria, ids),
    onMutate: async ({ categoria, ids }) => {
      await qc.cancelQueries({ queryKey: catalogoKeys.articulos })
      const previo = qc.getQueryData<ArticuloRestringido[]>(catalogoKeys.articulos)
      if (previo) {
        const pos = new Map(ids.map((id, i) => [id, i + 1]))
        qc.setQueryData<ArticuloRestringido[]>(
          catalogoKeys.articulos,
          previo.map((a) => (a.categoria === categoria && pos.has(a.id) ? { ...a, orden: pos.get(a.id)! } : a)),
        )
      }
      return { previo }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previo) qc.setQueryData(catalogoKeys.articulos, ctx.previo)
    },
    onSettled: () => invalidarCatalogo(qc),
  })
}
