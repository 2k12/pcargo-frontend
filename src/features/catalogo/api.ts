import { api } from '@/lib/api'
import type {
  ArticuloRestringido,
  CambioTipoCarga,
  CategoriaArticulo,
  DatosArticulo,
  DatosTipoCarga,
  FiltroHistorialTipos,
  NuevoTipoCarga,
  Pagina,
  TipoCarga,
} from '@/types/api'

/** Catálogo configurable (contrato v11): tipos de carga y artículos restringidos. Rutas de ADMIN salvo la lista de tipos. */
export const catalogoApi = {
  /** Todos los tipos, incluidos los inactivos (solo ADMIN), por `orden`. */
  tiposTodos: () => api.get<TipoCarga[]>('/tipos-carga', { todos: true }),
  crearTipo: (datos: NuevoTipoCarga) => api.post<TipoCarga>('/tipos-carga', datos),
  actualizarTipo: (codigo: string, cambios: Partial<DatosTipoCarga>) =>
    api.patch<TipoCarga>(`/tipos-carga/${encodeURIComponent(codigo)}`, cambios),
  eliminarTipo: (codigo: string) => api.delete<void>(`/tipos-carga/${encodeURIComponent(codigo)}`),
  ordenarTipos: (codigos: string[]) => api.put<TipoCarga[]>('/tipos-carga/orden', { codigos }),
  historial: (f: FiltroHistorialTipos) =>
    api.get<Pagina<CambioTipoCarga>>('/tipos-carga/historial', { codigo: f.codigo, pagina: f.pagina, porPagina: f.porPagina }),

  articulos: () => api.get<ArticuloRestringido[]>('/articulos-restringidos'),
  crearArticulo: (datos: DatosArticulo) => api.post<ArticuloRestringido>('/articulos-restringidos', datos),
  actualizarArticulo: (id: string, cambios: Partial<DatosArticulo>) =>
    api.patch<ArticuloRestringido>(`/articulos-restringidos/${encodeURIComponent(id)}`, cambios),
  eliminarArticulo: (id: string) => api.delete<void>(`/articulos-restringidos/${encodeURIComponent(id)}`),
  ordenarArticulos: (categoria: CategoriaArticulo, ids: string[]) =>
    api.put<ArticuloRestringido[]>('/articulos-restringidos/orden', { categoria, ids }),
}
