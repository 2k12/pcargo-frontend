import { api } from '@/lib/api'
import type {
  Cotizacion,
  CotizacionRequest,
  Envio,
  Estado,
  FiltrosEnvios,
  NuevoEnvio,
  TipoCarga,
} from '@/types/api'

export const enviosApi = {
  listar: (filtros: FiltrosEnvios = {}) =>
    api.get<Envio[]>('/envios', { estado: filtros.estado, rutaId: filtros.rutaId, q: filtros.q }),
  obtener: (id: string) => api.get<Envio>(`/envios/${id}`),
  crear: (data: NuevoEnvio) => api.post<Envio>('/envios', data),
  cambiarEstado: (id: string, estado: Estado, nota?: string) =>
    api.patch<Envio>(`/envios/${id}/estado`, { estado, nota: nota || undefined }),
  cotizar: (data: CotizacionRequest) => api.post<Cotizacion>('/envios/cotizar', data),
  tiposCarga: () => api.get<TipoCarga[]>('/tipos-carga'),
}
