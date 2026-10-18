import { api } from '@/lib/api'
import type { CajaPendiente, CierreCaja, FiltroCierres, NuevoCierreCaja, Pagina } from '@/types/api'

export const cajaApi = {
  pendientes: () => api.get<CajaPendiente[]>('/caja/pendientes'),
  pendiente: (usuarioId: string) => api.get<CajaPendiente>(`/caja/pendientes/${usuarioId}`),
  cerrar: (data: NuevoCierreCaja) => api.post<CierreCaja>('/caja/cierres', data),
  cierres: (f: FiltroCierres = {}) =>
    api.get<Pagina<CierreCaja>>('/caja/cierres', {
      usuarioId: f.usuarioId,
      desde: f.desde,
      hasta: f.hasta,
      pagina: f.pagina,
      porPagina: f.porPagina,
    }),
  cierre: (id: string) => api.get<CierreCaja>(`/caja/cierres/${id}`),
}
